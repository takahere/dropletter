import { anthropic } from "@ai-sdk/anthropic"
import { streamText, tool, StreamData } from "ai"
import { z } from "zod"
import {
  runAgent,
  runTextPipeline,
  runDocumentPipeline,
  type AgentType,
} from "@/lib/agents/runner"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 120

/**
 * Chat API - ドキュメント処理とAIチャット
 * filePathがある場合はPDFパイプライン、ない場合はテキストパイプラインを実行
 */
export async function POST(req: Request) {
  const { messages, data } = await req.json()

  // StreamDataを使用してクライアントにステータスを送信
  const streamData = new StreamData()

  // filePathがある場合は自動的にドキュメント処理を開始
  const filePath = data?.filePath as string | undefined
  const fileName = data?.fileName as string | undefined

  // 処理結果を保持
  type DocumentResultType = Awaited<ReturnType<typeof runDocumentPipeline>>
  let documentResult: DocumentResultType | null = null

  // バックグラウンドでドキュメント処理を実行
  if (filePath) {
    // ステータス更新コールバック
    const onStatusChange = (status: string) => {
      streamData.append({
        type: "status",
        status,
        timestamp: Date.now(),
      })
    }

    try {
      streamData.append({
        type: "processing_start",
        fileName: fileName ?? "",
        filePath: filePath ?? "",
      })

      documentResult = await runDocumentPipeline(filePath, onStatusChange)

      streamData.append({
        type: "processing_complete",
        result: {
          pagesCount: documentResult.parsed.metadata.pageCount,
          piiDetected: documentResult.masked.statistics.totalDetected,
          ngWordsCount: documentResult.fastCheck.ngWords.length,
          riskLevel: documentResult.deepReason.legalJudgment.riskLevel,
          isCompliant: documentResult.deepReason.legalJudgment.isCompliant,
          totalProcessingTime: documentResult.totalProcessingTime,
        },
      })

      // Auto-save to Supabase
      try {
        const supabase = await createClient()
        const { data: savedReport } = await supabase
          .from("reports")
          .insert({
            file_name: fileName ?? "document",
            file_path: filePath,
            result_json: {
              parsed: documentResult.parsed,
              masked: documentResult.masked,
              fastCheck: documentResult.fastCheck,
              deepReason: documentResult.deepReason,
              totalProcessingTime: documentResult.totalProcessingTime,
            },
          })
          .select("id")
          .single()

        if (savedReport) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
          streamData.append({
            type: "report_saved",
            reportId: savedReport.id,
            shareUrl: `${baseUrl}/share/${savedReport.id}`,
          })
        }
      } catch (saveError) {
        console.error("[Chat] Auto-save error:", saveError)
        // 保存失敗してもチャットは続行
      }
    } catch (error) {
      console.error("[Chat] Document processing error:", error)
      streamData.append({
        type: "processing_error",
        error: error instanceof Error ? error.message : "処理エラー",
      })
    }
  }

  // システムプロンプトにドキュメント解析結果を含める
  let systemPrompt = `あなたはDropLetterのAIアシスタントです。
ドキュメント処理と法的チェックを支援します。

## 役割
- アップロードされたドキュメントの解析結果を説明
- 法的問題点の詳細な解説
- 修正案の提案
- ユーザーからの質問への回答

## 利用可能なツール
- dispatch_agent: 各種AIエージェントを実行
- process_document: ドキュメント処理パイプラインを実行
- process_pdf: PDFファイルを解析してパイプラインを実行

## ガイドライン
- 日本語で回答してください
- 法的な問題については慎重に説明してください
- 専門用語を使う場合は、わかりやすい説明を添えてください
- 修正案を提示する際は、なぜその修正が必要かを説明してください`

  // ドキュメント処理結果がある場合、コンテキストに追加
  if (documentResult) {
    systemPrompt += `

## 解析済みドキュメント情報
以下のドキュメントが解析済みです。ユーザーの質問に基づいて、これらの結果を説明してください。

### ドキュメント内容（マスキング済み）
\`\`\`
${documentResult.masked.maskedText.substring(0, 2000)}${documentResult.masked.maskedText.length > 2000 ? "..." : ""}
\`\`\`

### 検出されたNGワード
${documentResult.fastCheck.ngWords.length > 0
  ? documentResult.fastCheck.ngWords
      .map((w) => `- 「${w.word}」(${w.severity}): ${w.reason}`)
      .join("\n")
  : "NGワードは検出されませんでした。"
}

### 法的判定
- コンプライアンス: ${documentResult.deepReason.legalJudgment.isCompliant ? "適合" : "要確認"}
- リスクレベル: ${documentResult.deepReason.legalJudgment.riskLevel}
- 問題点: ${documentResult.deepReason.legalJudgment.issues.length}件
${documentResult.deepReason.legalJudgment.issues
  .map((i) => `  - ${i.type}: ${i.description}`)
  .join("\n")}

### 郵便局員向け説明
${documentResult.deepReason.postalWorkerExplanation}

### 要約
${documentResult.deepReason.summary}`
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages,
    tools: {
      dispatch_agent: tool({
        description: `特定のAIエージェントを実行します。
- fast-check: Groq/Llama3を使った高速NGワード検出（約0.5秒）
- deep-reason: Claude を使った詳細な法的判定と修正案生成
- visual-parse: LlamaParseを使ったPDF解析
- pii-masking: Presidioを使った個人情報マスキング`,
        parameters: z.object({
          agentType: z
            .enum(["fast-check", "deep-reason", "visual-parse", "pii-masking"])
            .describe("実行するエージェントの種類"),
          input: z.string().describe("エージェントへの入力テキスト"),
          context: z.record(z.unknown()).optional().describe("追加のコンテキスト情報"),
        }),
        execute: async ({ agentType, input, context }) => {
          streamData.append({ type: "status", status: agentType })
          const result = await runAgent(agentType as AgentType, input, context)
          return {
            agentType,
            success: result.success,
            output: result.output,
            data: result.data,
            processingTime: result.processingTime,
            error: result.error,
          }
        },
      }),

      process_document: tool({
        description: `テキストに対してドキュメント処理パイプラインを実行します。
1. 個人情報マスキング（pii-masking）
2. NGワード高速チェック（fast-check）
3. 法的判定（deep-reason）`,
        parameters: z.object({
          documentText: z.string().describe("処理対象のドキュメントテキスト"),
        }),
        execute: async ({ documentText: docText }) => {
          const onStatusChange = (status: string) => {
            streamData.append({ type: "status", status })
          }
          const result = await runTextPipeline(docText, onStatusChange)
          return {
            success: true,
            masked: result.masked,
            fastCheck: result.fastCheck,
            deepReason: result.deepReason,
            totalProcessingTime: result.totalProcessingTime,
          }
        },
      }),

      process_pdf: tool({
        description: `PDFファイルを解析してパイプラインを実行します。
1. PDF解析（visual-parse）
2. 個人情報マスキング（pii-masking）
3. NGワード高速チェック（fast-check）
4. 法的判定（deep-reason）`,
        parameters: z.object({
          filePath: z.string().describe("PDFファイルの絶対パス"),
        }),
        execute: async ({ filePath: pdfPath }) => {
          const onStatusChange = (status: string) => {
            streamData.append({ type: "status", status })
          }
          const result = await runDocumentPipeline(pdfPath, onStatusChange)
          return {
            success: true,
            parsed: {
              pageCount: result.parsed.metadata.pageCount,
              markdown: result.parsed.markdown.substring(0, 1000),
            },
            masked: result.masked,
            fastCheck: result.fastCheck,
            deepReason: result.deepReason,
            totalProcessingTime: result.totalProcessingTime,
          }
        },
      }),

      get_legal_explanation: tool({
        description: "法的問題について郵便局員向けのわかりやすい説明を生成します",
        parameters: z.object({
          issue: z.string().describe("説明が必要な法的問題"),
          context: z.string().optional().describe("追加のコンテキスト"),
        }),
        execute: async ({ issue, context }) => {
          streamData.append({ type: "status", status: "deep-reason" })
          const result = await runAgent("deep-reason", issue, { context })
          if (result.success && result.data) {
            const data = result.data as { postalWorkerExplanation?: string }
            return {
              explanation: data.postalWorkerExplanation || "説明を生成できませんでした。",
            }
          }
          return { explanation: "説明の生成に失敗しました。" }
        },
      }),

      suggest_modification: tool({
        description: "問題のあるテキストの修正案を生成します",
        parameters: z.object({
          originalText: z.string().describe("修正が必要な元のテキスト"),
          issue: z.string().describe("問題点の説明"),
        }),
        execute: async ({ originalText, issue }) => {
          streamData.append({ type: "status", status: "deep-reason" })
          const agentResult = await runAgent("deep-reason", originalText, { issue })
          if (agentResult.success && agentResult.data) {
            const data = agentResult.data as {
              modifications?: Array<{ original: string; modified: string; reason: string }>
            }
            return {
              modifications: data.modifications || [],
            }
          }
          return { modifications: [] }
        },
      }),
    },
    onFinish: () => {
      streamData.close()
    },
  })

  return result.toDataStreamResponse({
    data: streamData,
  })
}
