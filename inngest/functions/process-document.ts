import { inngest } from "../client"
import { runDocumentPipeline } from "@/lib/agents/runner"

/**
 * Document Processing Function
 *
 * 処理パイプライン:
 * 1. visual-parse: PDF解析（LlamaParse）
 * 2. pii-masking: 個人情報マスキング（Presidio）
 * 3. fast-check: NGワード高速チェック（Groq/Llama3）
 * 4. deep-reason: 法的判定（Claude）
 */
export const processDocument = inngest.createFunction(
  {
    id: "process-document",
    name: "Process Document",
    retries: 3,
  },
  { event: "document/uploaded" },
  async ({ event, step }) => {
    const { fileUrl, fileName, documentText } = event.data

    // Step 1: Parse document with LlamaParse (if PDF)
    const parsed = await step.run("visual-parse", async () => {
      if (fileUrl?.endsWith(".pdf")) {
        // TODO: Implement LlamaParse integration
        // const result = await runVisualParse(fileUrl)
        // return result
        return {
          markdown: documentText || "",
          metadata: { pageCount: 1 },
        }
      }
      return {
        markdown: documentText || "",
        metadata: { pageCount: 1 },
      }
    })

    // Step 2: Mask PII with Presidio
    const masked = await step.run("pii-masking", async () => {
      // TODO: Implement Presidio integration
      // const result = await runPIIMasking(parsed.markdown)
      // return result
      return {
        maskedText: parsed.markdown,
        detectedEntities: [],
        statistics: { totalDetected: 0, byType: {} },
      }
    })

    // Step 3: Fast check with Groq
    const fastCheck = await step.run("fast-check", async () => {
      const { runFastCheck } = await import("@/lib/agents/runner")
      return runFastCheck(masked.maskedText)
    })

    // Step 4: Deep reason with Claude
    const deepReason = await step.run("deep-reason", async () => {
      const { runDeepReason } = await import("@/lib/agents/runner")
      return runDeepReason(masked.maskedText, fastCheck)
    })

    // Step 5: Store results
    const stored = await step.run("store-results", async () => {
      // TODO: Store in Supabase
      return {
        success: true,
        documentId: crypto.randomUUID(),
      }
    })

    return {
      fileName,
      documentId: stored.documentId,
      parsed: {
        pageCount: parsed.metadata.pageCount,
      },
      piiMasking: {
        totalDetected: masked.statistics.totalDetected,
      },
      fastCheck: {
        ngWordsCount: fastCheck.ngWords.length,
        processingTimeMs: fastCheck.processingTimeMs,
      },
      deepReason: {
        isCompliant: deepReason.legalJudgment.isCompliant,
        riskLevel: deepReason.legalJudgment.riskLevel,
        issuesCount: deepReason.legalJudgment.issues.length,
        summary: deepReason.summary,
      },
    }
  }
)

/**
 * Send notification when document processing is complete
 */
export const notifyProcessingComplete = inngest.createFunction(
  {
    id: "notify-processing-complete",
    name: "Notify Processing Complete",
  },
  { event: "document/processed" },
  async ({ event, step }) => {
    const { documentId, userId, summary } = event.data

    // TODO: Send notification via preferred channel
    // (email, push notification, websocket, etc.)
    await step.run("send-notification", async () => {
      console.log(`Document ${documentId} processed for user ${userId}`)
      console.log(`Summary: ${summary}`)
      return { sent: true }
    })
  }
)
