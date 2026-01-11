import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Process Status API - ファイル処理状態を取得
 * GET /api/process/status?fileIds=xxx,yyy
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const fileIdsParam = searchParams.get("fileIds")

    if (!fileIdsParam) {
      return NextResponse.json(
        { success: false, error: "fileIdsパラメータが必要です" },
        { status: 400 }
      )
    }

    const fileIds = fileIdsParam.split(",").filter(Boolean)

    if (fileIds.length === 0) {
      return NextResponse.json({
        success: true,
        statuses: [],
      })
    }

    const supabase = await createClient()

    const { data: reports, error } = await supabase
      .from("reports")
      .select(
        "id, file_id, file_name, status, processing_status, progress, result_json"
      )
      .in("file_id", fileIds)

    if (error) {
      console.error("[ProcessStatus] Query error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // fileIdごとの状態をマッピング
    const statuses = fileIds.map((fileId) => {
      const report = reports?.find((r) => r.file_id === fileId)
      if (!report) {
        return {
          fileId,
          status: "not_found" as const,
          processingStatus: null,
          progress: 0,
          reportId: null,
          result: null,
        }
      }

      // result_jsonからサマリー情報を抽出
      const resultJson = report.result_json as Record<string, unknown> | null
      let result = null

      if (resultJson && report.status === "completed") {
        const deepReason = resultJson.deepReason as Record<string, unknown> | undefined
        const fastCheck = resultJson.fastCheck as Record<string, unknown> | undefined
        const masked = resultJson.masked as Record<string, unknown> | undefined

        if (deepReason) {
          const legalJudgment = deepReason.legalJudgment as Record<string, unknown> | undefined
          result = {
            riskLevel: legalJudgment?.riskLevel || "none",
            isCompliant: legalJudgment?.isCompliant ?? true,
            ngWordsCount: Array.isArray(fastCheck?.ngWords)
              ? fastCheck.ngWords.length
              : 0,
            piiDetected:
              (masked?.statistics as Record<string, unknown>)?.totalDetected || 0,
            summary: deepReason.summary as string | undefined,
          }
        }
      }

      return {
        fileId,
        status: report.status,
        processingStatus: report.processing_status,
        progress: report.progress || 0,
        reportId: report.id,
        result,
      }
    })

    return NextResponse.json({
      success: true,
      statuses,
    })
  } catch (error) {
    console.error("[ProcessStatus] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "状態の取得に失敗しました",
      },
      { status: 500 }
    )
  }
}
