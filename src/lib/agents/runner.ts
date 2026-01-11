import { spawn } from "child_process"
import path from "path"

const SKILLS_DIR = path.join(process.cwd(), ".claude/skills")

// Agent types
export type AgentType = "fast-check" | "deep-reason" | "visual-parse" | "pii-masking"

export interface AgentResult {
  success: boolean
  output: string
  data?: Record<string, unknown>
  error?: string
  processingTime?: number
}

export interface FastCheckResult {
  ngWords: Array<{
    word: string
    position: number
    severity: "high" | "medium" | "low"
    reason: string
  }>
  processingTimeMs: number
}

export interface DeepReasonResult {
  legalJudgment: {
    isCompliant: boolean
    riskLevel: "none" | "low" | "medium" | "high" | "critical"
    issues: Array<{
      type: string
      description: string
      location: string
      suggestedFix: string
    }>
  }
  modifications: Array<{
    original: string
    modified: string
    reason: string
  }>
  postalWorkerExplanation: string
  summary: string
}

export interface VisualParseResult {
  markdown: string
  metadata: {
    pageCount: number
    title?: string
    author?: string
    createdAt?: string
  }
  pages: Array<{
    pageNumber: number
    content: string
    images?: unknown[]
    tables?: unknown[]
  }>
}

export interface PIIMaskingResult {
  maskedText: string
  detectedEntities: Array<{
    type: string
    text: string
    start: number
    end: number
    score: number
  }>
  statistics: {
    totalDetected: number
    byType: Record<string, number>
  }
}

export interface PdfHighlightInput {
  filePath: string
  searchItems: Array<{
    id: string
    type: "ng_word" | "pii" | "legal_issue"
    text: string
    severity: string
    reason?: string
    suggestedFix?: string
  }>
}

export interface PdfHighlightOutput {
  highlights: Array<{
    id: string
    type: string
    text: string
    severity: string
    reason?: string
    suggestedFix?: string
    positions: Array<{
      pageNumber: number
      x0: number
      y0: number
      x1: number
      y1: number
    }>
  }>
  notFound: string[]
  pageCount: number
}

/**
 * Extract JSON from a string that may contain other text (warnings, logs, etc.)
 */
function extractJSON(text: string): string {
  // Try to find JSON object
  const objectMatch = text.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    // Validate it's proper JSON
    try {
      JSON.parse(objectMatch[0])
      return objectMatch[0]
    } catch {
      // Not valid JSON, continue
    }
  }

  // Try to find JSON array
  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      JSON.parse(arrayMatch[0])
      return arrayMatch[0]
    } catch {
      // Not valid JSON
    }
  }

  // Return original text if no JSON found
  return text
}

/**
 * Execute a Python skill script via subprocess
 */
async function runPythonSkill(
  skillName: string,
  scriptName: string,
  args: string[],
  timeoutMs: number = 60000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SKILLS_DIR, skillName, "scripts", scriptName)

    // 環境変数を明示的に設定（Next.jsの.env.localから確実に渡す）
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      // API Keys を明示的に渡す
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
      GROQ_API_KEY: process.env.GROQ_API_KEY || "",
      LLAMA_CLOUD_API_KEY: process.env.LLAMA_CLOUD_API_KEY || "",
    }

    // デバッグ: 環境変数が設定されているか確認（常にログ出力）
    if (skillName === "visual-parse") {
      console.log("[Runner] LLAMA_CLOUD_API_KEY present:", !!env.LLAMA_CLOUD_API_KEY)
      if (!env.LLAMA_CLOUD_API_KEY) {
        console.error("[Runner] LLAMA_CLOUD_API_KEY is not set! Check .env.local")
      }
    }

    const proc = spawn("python", [scriptPath, ...args], { env })

    let stdout = ""
    let stderr = ""
    let killed = false

    proc.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    proc.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    proc.on("close", (code) => {
      if (killed) return
      if (code === 0) {
        // Extract JSON from output (ignore warnings/logs)
        const jsonOutput = extractJSON(stdout)
        resolve(jsonOutput)
      } else {
        // Even on error, try to extract JSON from stdout
        const jsonOutput = extractJSON(stdout)
        if (jsonOutput !== stdout && jsonOutput.startsWith("{")) {
          resolve(jsonOutput)
        } else {
          reject(new Error(stderr || `Process exited with code ${code}`))
        }
      }
    })

    proc.on("error", (err) => {
      reject(err)
    })

    // Timeout handling
    const timer = setTimeout(() => {
      killed = true
      proc.kill()
      reject(new Error(`Timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    proc.on("close", () => {
      clearTimeout(timer)
    })
  })
}

/**
 * Run the fast-check agent using Groq (Llama 3)
 * Performs high-speed NG word detection in ~0.5 seconds
 */
export async function runFastCheck(text: string): Promise<FastCheckResult> {
  const startTime = Date.now()

  try {
    const output = await runPythonSkill("fast-check", "fast_check.py", [text])
    const result = JSON.parse(output)
    return {
      ngWords: result.ngWords || [],
      processingTimeMs: result.processingTimeMs || (Date.now() - startTime),
    }
  } catch (error) {
    console.error("Fast check error:", error)
    return {
      ngWords: [],
      processingTimeMs: Date.now() - startTime,
    }
  }
}

/**
 * Run the deep-reason agent using Claude
 * Performs detailed legal judgment and generates modification suggestions
 */
export async function runDeepReason(
  text: string,
  fastCheckResult?: FastCheckResult
): Promise<DeepReasonResult> {
  try {
    const args = [text]
    if (fastCheckResult) {
      args.push(JSON.stringify({ ngWords: fastCheckResult.ngWords }))
    }

    const output = await runPythonSkill("deep-reason", "deep_reason.py", args)
    return JSON.parse(output) as DeepReasonResult
  } catch (error) {
    console.error("Deep reason error:", error)
    return {
      legalJudgment: {
        isCompliant: true,
        riskLevel: "none",
        issues: [],
      },
      modifications: [],
      postalWorkerExplanation: "解析に失敗しました。",
      summary: "エラーが発生しました。",
    }
  }
}

/**
 * Run the visual-parse agent using LlamaParse
 * Converts PDF to structured markdown
 */
export async function runVisualParse(
  filePath: string,
  language: string = "ja"
): Promise<VisualParseResult> {
  try {
    const output = await runPythonSkill("visual-parse", "visual_parse.py", [
      filePath,
      language,
    ])
    const result = JSON.parse(output) as VisualParseResult & { error?: string }

    // エラーフィールドがある場合はエラーをスロー
    if (result.error) {
      throw new Error(`PDF解析エラー: ${result.error}`)
    }

    return result
  } catch (error) {
    console.error("Visual parse error:", error)
    // エラーを再スローして上位で処理
    throw error
  }
}

/**
 * Run the pii-masking agent using Microsoft Presidio
 * Detects and masks personal information
 */
export async function runPiiMasking(
  text: string,
  scoreThreshold: number = 0.7
): Promise<PIIMaskingResult> {
  try {
    const output = await runPythonSkill("pii-masking", "pii_masking.py", [
      text,
      scoreThreshold.toString(),
    ])
    return JSON.parse(output) as PIIMaskingResult
  } catch (error) {
    console.error("PII masking error:", error)
    return {
      maskedText: text,
      detectedEntities: [],
      statistics: { totalDetected: 0, byType: {} },
    }
  }
}

/**
 * Run the pdf-highlight agent using PyMuPDF
 * Finds text positions in PDF for highlighting
 */
export async function runPdfHighlight(
  filePath: string,
  searchItems: PdfHighlightInput["searchItems"]
): Promise<PdfHighlightOutput> {
  try {
    const searchItemsJson = JSON.stringify(searchItems)
    const output = await runPythonSkill("pdf-highlight", "pdf_highlight.py", [
      filePath,
      searchItemsJson,
    ])
    return JSON.parse(output) as PdfHighlightOutput
  } catch (error) {
    console.error("PDF highlight error:", error)
    return {
      highlights: [],
      notFound: searchItems.map((item) => item.text),
      pageCount: 0,
    }
  }
}

/**
 * Generic agent runner that dispatches to the appropriate agent
 */
export async function runAgent(
  agentType: AgentType,
  input: string,
  context?: Record<string, unknown>
): Promise<AgentResult> {
  const startTime = Date.now()

  try {
    switch (agentType) {
      case "fast-check": {
        const result = await runFastCheck(input)
        return {
          success: true,
          output: JSON.stringify(result, null, 2),
          data: result as unknown as Record<string, unknown>,
          processingTime: Date.now() - startTime,
        }
      }

      case "deep-reason": {
        const fastCheckResult = context?.fastCheckResult as FastCheckResult | undefined
        const result = await runDeepReason(input, fastCheckResult)
        return {
          success: true,
          output: JSON.stringify(result, null, 2),
          data: result as unknown as Record<string, unknown>,
          processingTime: Date.now() - startTime,
        }
      }

      case "visual-parse": {
        const language = (context?.language as string) || "ja"
        const result = await runVisualParse(input, language)
        return {
          success: true,
          output: JSON.stringify(result, null, 2),
          data: result as unknown as Record<string, unknown>,
          processingTime: Date.now() - startTime,
        }
      }

      case "pii-masking": {
        const threshold = (context?.scoreThreshold as number) || 0.7
        const result = await runPiiMasking(input, threshold)
        return {
          success: true,
          output: JSON.stringify(result, null, 2),
          data: result as unknown as Record<string, unknown>,
          processingTime: Date.now() - startTime,
        }
      }

      default:
        return {
          success: false,
          output: "",
          error: `Unknown agent type: ${agentType}`,
          processingTime: Date.now() - startTime,
        }
    }
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Unknown error",
      processingTime: Date.now() - startTime,
    }
  }
}

/**
 * Run text-based pipeline (pii-masking → fast-check → deep-reason)
 * Use this when you already have extracted text
 */
export async function runTextPipeline(
  text: string,
  onStatusChange?: (status: string) => void
): Promise<{
  masked: PIIMaskingResult
  fastCheck: FastCheckResult
  deepReason: DeepReasonResult
  totalProcessingTime: number
}> {
  const startTime = Date.now()

  // Step 1: PII Masking
  onStatusChange?.("pii-masking")
  const masked = await runPiiMasking(text)

  // Step 2: Fast Check
  onStatusChange?.("fast-check")
  const fastCheck = await runFastCheck(masked.maskedText)

  // Step 3: Deep Reason
  onStatusChange?.("deep-reason")
  const deepReason = await runDeepReason(masked.maskedText, fastCheck)

  onStatusChange?.("complete")

  return {
    masked,
    fastCheck,
    deepReason,
    totalProcessingTime: Date.now() - startTime,
  }
}

/**
 * Run the full document processing pipeline
 * Use this when processing a PDF file from scratch
 */
export async function runDocumentPipeline(
  filePath: string,
  onStatusChange?: (status: string) => void
): Promise<{
  parsed: VisualParseResult
  masked: PIIMaskingResult
  fastCheck: FastCheckResult
  pdfHighlight: PdfHighlightOutput
  deepReason: DeepReasonResult
  totalProcessingTime: number
}> {
  const startTime = Date.now()

  // Step 1: Visual Parse (PDF → Markdown)
  onStatusChange?.("visual-parse")
  const parsed = await runVisualParse(filePath)

  // PDF解析結果が空の場合はエラー
  if (!parsed.markdown || parsed.markdown.trim() === "") {
    throw new Error("PDFからテキストを抽出できませんでした。ファイル形式を確認するか、再度アップロードしてください。")
  }

  console.log("[Pipeline] PDF parsed successfully, markdown length:", parsed.markdown.length)

  // Step 2: PII Masking
  onStatusChange?.("pii-masking")
  const masked = await runPiiMasking(parsed.markdown)

  // Step 3: Fast Check
  onStatusChange?.("fast-check")
  const fastCheck = await runFastCheck(masked.maskedText)

  // Step 4: PDF Highlight - NGワードとPIIの位置を特定
  onStatusChange?.("pdf-highlight")
  const searchItems: PdfHighlightInput["searchItems"] = [
    ...fastCheck.ngWords.map((ng, i) => ({
      id: `ng-${i}`,
      type: "ng_word" as const,
      text: ng.word,
      severity: ng.severity,
      reason: ng.reason,
    })),
    ...masked.detectedEntities.map((pii, i) => ({
      id: `pii-${i}`,
      type: "pii" as const,
      text: pii.text,
      severity: "medium",
      reason: `個人情報: ${pii.type}`,
    })),
  ]

  const pdfHighlight = await runPdfHighlight(filePath, searchItems)
  console.log("[Pipeline] PDF highlight completed:", {
    found: pdfHighlight.highlights.length,
    notFound: pdfHighlight.notFound.length,
  })

  // Step 5: Deep Reason
  onStatusChange?.("deep-reason")
  const deepReason = await runDeepReason(masked.maskedText, fastCheck)

  onStatusChange?.("complete")

  return {
    parsed,
    masked,
    fastCheck,
    pdfHighlight,
    deepReason,
    totalProcessingTime: Date.now() - startTime,
  }
}
