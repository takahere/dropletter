import { NextRequest, NextResponse } from "next/server"
import { inngest } from "@/../../inngest/client"
import { createServiceClient } from "@/lib/supabase/server"

export const maxDuration = 30

/**
 * Retry API - 既存レポートの処理を再開
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: "レポートIDが必要です" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 既存レポートを取得
    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("id, file_id, file_name, file_path, status")
      .eq("id", reportId)
      .single()

    if (fetchError || !report) {
      console.error("[Retry] Report not found:", fetchError)
      return NextResponse.json(
        { success: false, error: "レポートが見つかりません" },
        { status: 404 }
      )
    }

    // ステータスをリセット
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        status: "pending",
        processing_status: "pending",
        progress: 0,
        result_json: {},
      })
      .eq("id", reportId)

    if (updateError) {
      console.error("[Retry] Update error:", updateError)
      return NextResponse.json(
        { success: false, error: "ステータスの更新に失敗しました" },
        { status: 500 }
      )
    }

    // Inngestイベントを再発火
    await inngest.send({
      name: "document/process",
      data: {
        fileId: report.file_id,
        filePath: report.file_path,
        fileName: report.file_name,
        reportId: report.id,
      },
    })

    console.log("[Retry] Processing restarted for report:", reportId)

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: "処理を再開しました",
    })
  } catch (error) {
    console.error("[Retry] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "リトライに失敗しました",
      },
      { status: 500 }
    )
  }
}
