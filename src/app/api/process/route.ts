import { NextRequest, NextResponse } from "next/server"
import { inngest } from "@/../../inngest/client"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 30

/**
 * Process API - Inngestイベントを発火してドキュメント処理を開始
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fileId, filePath, fileName } = body

    if (!fileId || !filePath || !fileName) {
      return NextResponse.json(
        { success: false, error: "必須パラメータが不足しています" },
        { status: 400 }
      )
    }

    // Supabaseにレポートレコードを作成（pending状態）
    const supabase = await createClient()
    const { data: report, error: insertError } = await supabase
      .from("reports")
      .insert({
        file_id: fileId,
        file_name: fileName,
        file_path: filePath,
        status: "pending",
        processing_status: "pending",
        progress: 0,
        result_json: {},
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("[Process] Insert error:", insertError)
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      )
    }

    // Inngestイベントを発火
    await inngest.send({
      name: "document/process",
      data: {
        fileId,
        filePath,
        fileName,
        reportId: report.id,
      },
    })

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: "処理を開始しました",
    })
  } catch (error) {
    console.error("[Process] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "処理の開始に失敗しました",
      },
      { status: 500 }
    )
  }
}
