import { inngest } from "../client"
import { runDocumentPipeline } from "@/lib/agents/runner"
import { createServerClient } from "@supabase/ssr"

// Supabaseクライアント（サーバーサイド用、cookieなし）
function createSupabaseAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}

// 進捗状態を更新するヘルパー
async function updateProgress(
  reportId: string,
  processingStatus: string,
  progress: number
) {
  const supabase = createSupabaseAdmin()
  await supabase
    .from("reports")
    .update({
      processing_status: processingStatus,
      progress,
      status: "processing",
    })
    .eq("id", reportId)
}

// 処理完了時のヘルパー
async function completeProcessing(
  reportId: string,
  resultJson: Record<string, unknown>
) {
  const supabase = createSupabaseAdmin()
  await supabase
    .from("reports")
    .update({
      processing_status: "complete",
      progress: 100,
      status: "completed",
      result_json: resultJson,
    })
    .eq("id", reportId)
}

// エラー時のヘルパー
async function failProcessing(reportId: string, error: string) {
  const supabase = createSupabaseAdmin()
  await supabase
    .from("reports")
    .update({
      processing_status: "error",
      status: "error",
      result_json: { error },
    })
    .eq("id", reportId)
}

// イベントデータの型定義
interface DocumentProcessEventData {
  fileId: string
  filePath: string
  fileName: string
  reportId: string
}

/**
 * Document Processing Function V2
 * 並列処理対応版 - 進捗状態をSupabaseに保存
 */
export const processDocumentV2 = inngest.createFunction(
  {
    id: "process-document-v2",
    name: "Process Document V2",
    retries: 3,
    onFailure: async ({ error, event }) => {
      // onFailure の event は失敗イベントをラップしているため、
      // 元のイベントデータにアクセスする
      const originalEvent = (event as unknown as { data: { event?: { data?: DocumentProcessEventData } } })
      const eventData = originalEvent?.data?.event?.data
      if (eventData?.reportId) {
        await failProcessing(
          eventData.reportId,
          error?.message || "処理中にエラーが発生しました"
        )
      }
    },
  },
  { event: "document/process" },
  async ({ event, step }) => {
    const { fileId, filePath, fileName, reportId } = event.data as DocumentProcessEventData

    // Step 1: 処理開始
    await step.run("start-processing", async () => {
      await updateProgress(reportId, "parsing", 10)
      return { status: "started" }
    })

    // Step 2: ドキュメントパイプライン実行
    const pipelineResult = await step.run("run-pipeline", async () => {
      let lastStatus = "parsing"

      // 進捗コールバック
      const onStatusChange = async (status: string) => {
        lastStatus = status
        const progressMap: Record<string, number> = {
          "visual-parse": 15,
          "pii-masking": 30,
          "fast-check": 45,
          "pdf-highlight": 60,
          "deep-reason": 80,
          complete: 100,
        }
        const progress = progressMap[status] || 50

        // 非同期で進捗更新（await しない）
        updateProgress(reportId, status, progress).catch(console.error)
      }

      try {
        const result = await runDocumentPipeline(filePath, onStatusChange)
        return {
          success: true,
          parsed: result.parsed,
          masked: result.masked,
          fastCheck: result.fastCheck,
          pdfHighlight: result.pdfHighlight,
          deepReason: result.deepReason,
          totalProcessingTime: result.totalProcessingTime,
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "処理エラー",
        }
      }
    })

    // Step 3: 結果を保存
    await step.run("save-results", async () => {
      if (!pipelineResult.success) {
        const errorResult = pipelineResult as { success: false; error: string }
        await failProcessing(reportId, errorResult.error || "処理に失敗しました")
        return { success: false }
      }

      const successResult = pipelineResult as {
        success: true
        parsed: unknown
        masked: { statistics?: { totalDetected?: number } }
        fastCheck: { ngWords?: Array<unknown> }
        pdfHighlight: { highlights?: Array<unknown>; notFound?: string[] }
        deepReason: { legalJudgment?: { riskLevel?: string; isCompliant?: boolean } }
        totalProcessingTime: number
      }

      await completeProcessing(reportId, {
        parsed: successResult.parsed,
        masked: successResult.masked,
        fastCheck: successResult.fastCheck,
        highlights: successResult.pdfHighlight?.highlights || [],
        highlightsNotFound: successResult.pdfHighlight?.notFound || [],
        deepReason: successResult.deepReason,
        totalProcessingTime: successResult.totalProcessingTime,
      })

      return { success: true }
    })

    // 結果のサマリーを返す
    if (!pipelineResult.success) {
      return {
        fileId,
        fileName,
        reportId,
        success: false,
        result: null,
      }
    }

    const successResult = pipelineResult as {
      success: true
      masked: { statistics?: { totalDetected?: number } }
      fastCheck: { ngWords?: Array<unknown> }
      pdfHighlight: { highlights?: Array<unknown>; notFound?: string[] }
      deepReason: { legalJudgment?: { riskLevel?: string; isCompliant?: boolean } }
    }

    return {
      fileId,
      fileName,
      reportId,
      success: true,
      result: {
        riskLevel: successResult.deepReason?.legalJudgment?.riskLevel,
        isCompliant: successResult.deepReason?.legalJudgment?.isCompliant,
        ngWordsCount: successResult.fastCheck?.ngWords?.length || 0,
        piiDetected: successResult.masked?.statistics?.totalDetected || 0,
        highlightsFound: successResult.pdfHighlight?.highlights?.length || 0,
        highlightsNotFound: successResult.pdfHighlight?.notFound?.length || 0,
      },
    }
  }
)
