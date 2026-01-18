import { inngest } from "../client"
import { runDocumentPipeline } from "@/lib/agents/runner"
import { createClient } from "@supabase/supabase-js"
import { writeFile, mkdir, unlink } from "fs/promises"
import { tmpdir } from "os"
import path from "path"

// Supabaseクライアント（Service Role - RLSバイパス）
function createSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    console.warn("[Inngest] SUPABASE_SERVICE_ROLE_KEY is not set, using anon key")
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Supabase Storageからファイルをダウンロードしてローカルに保存
async function downloadFileFromStorage(storagePath: string): Promise<string> {
  const supabase = createSupabaseAdmin()

  // storagePath形式: "uploads/uuid.pdf" -> bucket="uploads", path="uuid.pdf"
  const [bucket, ...pathParts] = storagePath.split("/")
  const filePath = pathParts.join("/")

  console.log(`[Inngest] Downloading from storage: bucket=${bucket}, path=${filePath}`)
  console.log(`[Inngest] Original storagePath: ${storagePath}`)

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath)

  if (error) {
    console.error(`[Inngest] Storage download error:`, error)
    throw new Error(`Storage download failed: ${error.message}`)
  }

  if (!data) {
    console.error(`[Inngest] Storage download returned no data`)
    throw new Error("Storage download returned no data")
  }

  console.log(`[Inngest] Downloaded blob size: ${data.size}, type: ${data.type}`)

  // 一時ディレクトリに保存
  const uploadDir = path.join(tmpdir(), "dropletter-processing")
  await mkdir(uploadDir, { recursive: true })

  const localPath = path.join(uploadDir, filePath)
  const buffer = Buffer.from(await data.arrayBuffer())
  await writeFile(localPath, buffer)

  console.log(`[Inngest] File downloaded to: ${localPath}, size: ${buffer.length} bytes`)
  return localPath
}

// 一時ファイルを削除
async function cleanupTempFile(localPath: string): Promise<void> {
  try {
    await unlink(localPath)
    console.log(`[Inngest] Cleaned up temp file: ${localPath}`)
  } catch (error) {
    console.warn(`[Inngest] Failed to cleanup temp file: ${localPath}`, error)
  }
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

      // 詳細なエラー情報をログ出力
      console.error("[Inngest onFailure] Error occurred:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        fileName: eventData?.fileName,
        filePath: eventData?.filePath,
      })

      // エラーメッセージを構築
      let errorMessage = "処理中にエラーが発生しました"
      if (error?.message) {
        errorMessage = error.message
        // Gemini APIエラーの詳細を含める
        if (error.message.includes("Gemini")) {
          errorMessage = `画像処理エラー: ${error.message}`
        }
      }

      if (eventData?.reportId) {
        await failProcessing(eventData.reportId, errorMessage)
      }
    },
  },
  { event: "document/process" },
  async ({ event, step }) => {
    const { fileId, filePath, fileName, reportId } = event.data as DocumentProcessEventData

    // Step 1: 処理開始 & ファイルダウンロード
    const downloadResult = await step.run("start-processing", async () => {
      await updateProgress(reportId, "parsing", 10)

      // Supabase Storageからファイルをダウンロード
      // filePath形式: "uploads/uuid.pdf" (新形式) or "/tmp/..." (旧形式)
      let localFilePath: string
      if (filePath.startsWith("uploads/") || filePath.startsWith("documents/")) {
        // Supabase Storage形式
        localFilePath = await downloadFileFromStorage(filePath)
      } else {
        // 旧形式（ローカルパス）- 互換性のため
        localFilePath = filePath
      }

      return { status: "started", localFilePath }
    })

    const localFilePath = downloadResult.localFilePath

    // Step 2: ドキュメントパイプライン実行
    const pipelineResult = await step.run("run-pipeline", async () => {
      let lastStatus = "parsing"

      // デバッグ用ログ
      console.log(`[Inngest] Starting pipeline for file: ${fileName}`)
      console.log(`[Inngest] Local file path: ${localFilePath}`)
      console.log(`[Inngest] GEMINI_API_KEY present: ${!!process.env.GEMINI_API_KEY}`)
      console.log(`[Inngest] GROQ_API_KEY present: ${!!process.env.GROQ_API_KEY}`)
      console.log(`[Inngest] ANTHROPIC_API_KEY present: ${!!process.env.ANTHROPIC_API_KEY}`)

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
        const result = await runDocumentPipeline(localFilePath, onStatusChange)
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
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined
        console.error(`[Inngest] Pipeline error for ${fileName}:`, {
          message: errorMessage,
          stack: errorStack,
          lastStatus,
        })
        return {
          success: false,
          error: errorMessage,
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

    // Step 4: 一時ファイルのクリーンアップ
    await step.run("cleanup", async () => {
      // Storage形式の場合のみクリーンアップ
      if (filePath.startsWith("uploads/") || filePath.startsWith("documents/")) {
        await cleanupTempFile(localFilePath)
      }
      return { cleaned: true }
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
