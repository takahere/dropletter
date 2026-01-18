import Anthropic from "@anthropic-ai/sdk"
import { GoogleGenAI } from "@google/genai"
import Groq from "groq-sdk"
import * as pdfjs from "pdfjs-dist"
import { readFile } from "fs/promises"
import path from "path"
import { getShinshoGuidelineForPrompt } from "@/lib/legal-guidelines"

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
  shinshoJudgment?: {
    isShinsho: boolean
    confidence: "high" | "medium" | "low"
    reason: string
    documentType: string
    relevantPatterns: string[]
  }
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

// ============================================
// Fast Check - Groq/Llama 3 による高速NGワード検出
// ============================================

const FAST_CHECK_SYSTEM_PROMPT = `You are a fast NG word detector. Analyze the text and identify potentially problematic words or phrases.
Output JSON only with this structure:
{
  "ngWords": [
    {
      "word": "string",
      "position": number,
      "severity": "high" | "medium" | "low",
      "reason": "string"
    }
  ]
}

Focus on:
- Discriminatory language (差別的表現)
- Defamatory statements (名誉毀損)
- Privacy violations (プライバシー侵害)
- Threatening content (脅迫・恐喝)
- Inappropriate content (不適切なコンテンツ)
- Legal risks (法的リスク)

Be fast and accurate. Output ONLY valid JSON.
Respond in Japanese for the reason field.`

/**
 * Run the fast-check agent using Groq (Llama 3)
 * Performs high-speed NG word detection in ~0.5 seconds
 */
export async function runFastCheck(text: string): Promise<FastCheckResult> {
  const startTime = Date.now()

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: FAST_CHECK_SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content || "{}"
    const parsed = JSON.parse(content)

    return {
      ngWords: parsed.ngWords || [],
      processingTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[FastCheck] Error:", error)
    console.error("[FastCheck] Error message:", errorMessage)
    console.error("[FastCheck] Input text length:", text?.length)
    // エラー時は空配列を返すが、ログには詳細を出力
    return {
      ngWords: [],
      processingTimeMs: Date.now() - startTime,
    }
  }
}

// ============================================
// Deep Reason - Claude による詳細な法的判定
// ============================================

// DEEP_REASON_PROMPTテンプレート（信書ガイドラインは動的に挿入）
// 信書判定に特化したプロンプト
const DEEP_REASON_PROMPT_TEMPLATE = `あなたは信書判定の専門家です。以下のテキストが「信書」に該当するかどうかを、総務省の信書ガイドラインに基づいて判定してください。

{fast_check_context}

## 分析対象テキスト:
{text}

## 信書ガイドライン:
{shinsho_guidelines}

## 出力形式 (JSON):
{
  "legalJudgment": {
    "isCompliant": boolean,
    "riskLevel": "none" | "low" | "medium" | "high" | "critical",
    "issues": [
      {
        "type": "信書関連の問題カテゴリ",
        "description": "問題の詳細説明",
        "location": "問題箇所の引用",
        "suggestedFix": "修正案"
      }
    ]
  },
  "modifications": [
    {
      "original": "元のテキスト",
      "modified": "修正後のテキスト",
      "reason": "修正理由"
    }
  ],
  "shinshoJudgment": {
    "isShinsho": boolean,
    "confidence": "high" | "medium" | "low",
    "reason": "信書該当/非該当の理由（ガイドラインの具体的な条項を引用すること）",
    "documentType": "文書の種類（書状、請求書の類、証明書の類など）",
    "relevantPatterns": ["該当するパターン"]
  },
  "postalWorkerExplanation": "郵便局員への説明文（わかりやすい日本語で）",
  "summary": "全体の要約（100文字以内）"
}

## 判定の観点（信書便法・郵便法第4条に基づく）:
1. **特定の受取人**に対して
2. **差出人の意思を表示し、又は事実を通知する文書**かどうか

### 信書に該当する文書の例:
- 書状（手紙、はがき）
- 請求書の類（納品書、領収書、見積書、注文書）
- 会議招集通知の類（結婚式等の招待状）
- 許可書の類（免許証、認定書、表彰状）
- 証明書の類（印鑑証明書、納税証明書、戸籍謄本）
- ダイレクトメール（文書自体に受取人の氏名が記載され、商品購入等の勧誘を行うもの）

### 信書に該当しない文書の例:
- 書籍の類
- カタログ（商品の目録としてのもの）
- チラシ・パンフレット（不特定多数向け）
- 会報・機関紙（情報周知が主目的のもの）
- 小切手の類、クレジットカードの類
- プリペイドカード

## 郵便局員への説明は、以下の点に注意：
- 専門用語を避けてわかりやすく説明する
- **信書該当/非該当の判断理由を明確に説明する**
- **ガイドラインの該当条項を具体的に引用する**
- 文書の種類（書状、請求書の類など）を明示する
- 丁寧な言葉遣いで説明する

必ず有効なJSONのみを出力してください。`

/**
 * Run the deep-reason agent using Claude
 * Performs detailed legal judgment and generates modification suggestions
 */
export async function runDeepReason(
  text: string,
  fastCheckResult?: FastCheckResult
): Promise<DeepReasonResult> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Load shinsho guidelines from markdown files
    console.log("[DeepReason] Loading shinsho guidelines...")
    const shinshoGuidelines = await getShinshoGuidelineForPrompt(false)
    console.log("[DeepReason] Shinsho guidelines loaded, length:", shinshoGuidelines.length)

    // Build context from fast check results
    let fastCheckContext = ""
    if (fastCheckResult) {
      fastCheckContext = `
## Fast Check Results (Pre-analysis):
${JSON.stringify(fastCheckResult.ngWords, null, 2)}
`
    }

    const prompt = DEEP_REASON_PROMPT_TEMPLATE
      .replace("{text}", text)
      .replace("{fast_check_context}", fastCheckContext)
      .replace("{shinsho_guidelines}", shinshoGuidelines)

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    })

    const content = response.content[0].type === "text" ? response.content[0].text : ""

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : content

    const parsed = JSON.parse(jsonStr)

    return {
      legalJudgment: {
        isCompliant: parsed.legalJudgment?.isCompliant ?? true,
        riskLevel: parsed.legalJudgment?.riskLevel ?? "none",
        issues: parsed.legalJudgment?.issues ?? [],
      },
      modifications: parsed.modifications ?? [],
      shinshoJudgment: parsed.shinshoJudgment,
      postalWorkerExplanation: parsed.postalWorkerExplanation ?? "解析に失敗しました。",
      summary: parsed.summary ?? "",
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Deep reason error:", error)
    console.error("Deep reason error message:", errorMessage)
    return {
      legalJudgment: {
        isCompliant: true,
        riskLevel: "none",
        issues: [{
          type: "解析エラー",
          description: `法的判定中にエラーが発生しました: ${errorMessage}`,
          location: "N/A",
          suggestedFix: "しばらく待ってから再試行してください",
        }],
      },
      modifications: [],
      postalWorkerExplanation: `解析中にエラーが発生しました: ${errorMessage}`,
      summary: `エラー: ${errorMessage.substring(0, 50)}`,
    }
  }
}

// ============================================
// Visual Parse - LlamaParse REST API による PDF解析
// ============================================

const LLAMAPARSE_API_BASE = "https://api.cloud.llamaindex.ai/api/v1/parsing"

interface LlamaParseJobResponse {
  id: string
  status: string
}

interface LlamaParseStatusResponse {
  id: string
  status: "PENDING" | "SUCCESS" | "ERROR" | "PARTIAL_SUCCESS"
  num_pages?: number
}

interface LlamaParseResultResponse {
  markdown: string
  metadata?: {
    title?: string
    author?: string
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Run the visual-parse agent using LlamaParse REST API
 * Converts PDF to structured markdown
 */
export async function runVisualParse(
  filePath: string,
  language: string = "ja"
): Promise<VisualParseResult> {
  try {
    const apiKey = process.env.LLAMA_CLOUD_API_KEY

    console.log("[VisualParse] LLAMA_CLOUD_API_KEY present:", !!apiKey)

    if (!apiKey) {
      throw new Error("LLAMA_CLOUD_API_KEY is not set")
    }

    console.log("[VisualParse] Loading file:", filePath)

    // Step 1: Upload the PDF file
    const fileBuffer = await readFile(filePath)

    // Use Web standard FormData and Blob for Vercel compatibility
    const blob = new Blob([fileBuffer], { type: "application/pdf" })
    const formData = new FormData()
    formData.append("file", blob, "document.pdf")
    formData.append("language", language)

    console.log("[VisualParse] Uploading file to LlamaParse API...")

    const uploadResponse = await fetch(`${LLAMAPARSE_API_BASE}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      throw new Error(`LlamaParse upload failed: ${uploadResponse.status} - ${errorText}`)
    }

    // Parse response with error handling for malformed JSON
    let uploadResult: LlamaParseJobResponse
    try {
      uploadResult = (await uploadResponse.json()) as LlamaParseJobResponse
    } catch (parseError) {
      const responseText = await uploadResponse.clone().text().catch(() => "Unable to read response")
      throw new Error(`LlamaParse upload returned invalid JSON: ${responseText.substring(0, 200)}`)
    }
    const jobId = uploadResult.id

    console.log("[VisualParse] Job created:", jobId)

    // Step 2: Poll for job completion
    let status: LlamaParseStatusResponse["status"] = "PENDING"
    let statusResult: LlamaParseStatusResponse | null = null
    const maxAttempts = 60 // 5 minutes max (5s * 60)
    let attempts = 0

    while (status === "PENDING" && attempts < maxAttempts) {
      await sleep(5000) // Wait 5 seconds between polls
      attempts++

      const statusResponse = await fetch(`${LLAMAPARSE_API_BASE}/job/${jobId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      })

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text().catch(() => "")
        throw new Error(`LlamaParse status check failed: ${statusResponse.status} - ${errorText}`)
      }

      try {
        statusResult = (await statusResponse.json()) as LlamaParseStatusResponse
      } catch (parseError) {
        const responseText = await statusResponse.clone().text().catch(() => "Unable to read response")
        throw new Error(`LlamaParse status returned invalid JSON: ${responseText.substring(0, 200)}`)
      }
      status = statusResult.status

      console.log(`[VisualParse] Job status: ${status} (attempt ${attempts}/${maxAttempts})`)
    }

    if (status !== "SUCCESS" && status !== "PARTIAL_SUCCESS") {
      throw new Error(`LlamaParse job failed with status: ${status}`)
    }

    // Step 3: Get the markdown result
    const resultResponse = await fetch(`${LLAMAPARSE_API_BASE}/job/${jobId}/result/markdown`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    })

    if (!resultResponse.ok) {
      const errorText = await resultResponse.text().catch(() => "")
      throw new Error(`LlamaParse result fetch failed: ${resultResponse.status} - ${errorText}`)
    }

    let resultData: LlamaParseResultResponse
    try {
      resultData = (await resultResponse.json()) as LlamaParseResultResponse
    } catch (parseError) {
      const responseText = await resultResponse.clone().text().catch(() => "Unable to read response")
      throw new Error(`LlamaParse result returned invalid JSON: ${responseText.substring(0, 200)}`)
    }
    const markdown = resultData.markdown

    console.log("[VisualParse] Markdown retrieved, length:", markdown.length)

    // Parse pages (LlamaParse returns single markdown, split by page markers if present)
    const pageMarker = /---\s*Page\s+\d+\s*---/gi
    const pageParts = markdown.split(pageMarker).filter((p) => p.trim())
    const pageCount = statusResult?.num_pages || pageParts.length || 1

    const pages: VisualParseResult["pages"] = pageParts.length > 0
      ? pageParts.map((content, i) => ({
          pageNumber: i + 1,
          content: content.trim(),
        }))
      : [{
          pageNumber: 1,
          content: markdown,
        }]

    return {
      markdown,
      metadata: {
        pageCount,
        title: resultData.metadata?.title,
        author: resultData.metadata?.author,
      },
      pages,
    }
  } catch (error) {
    console.error("Visual parse error:", error)
    throw error
  }
}

// ============================================
// Image Vision - Gemini Flash マルチモーダルによる画像テキスト抽出
// ============================================

/**
 * Get MIME type from file extension
 */
function getMimeType(ext: string): "image/png" | "image/jpeg" | "image/webp" | "image/gif" {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png"
    case ".webp":
      return "image/webp"
    case ".gif":
      return "image/gif"
    case ".jpg":
    case ".jpeg":
    default:
      return "image/jpeg"
  }
}

/**
 * Check if file is an image based on extension
 */
export function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)
}

/**
 * Run image vision using Gemini Flash API (Multimodal)
 * Extracts text from images and returns it as markdown
 *
 * NOTE: Uses Gemini Flash for cost-effective, high-quality image processing
 * - Cost: ~1/10 of Claude Sonnet
 * - Accuracy: 93% (vs Claude 90% for image extraction)
 */
export async function runImageVision(filePath: string): Promise<VisualParseResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("[ImageVision] GEMINI_API_KEY is not set")
      throw new Error("GEMINI_API_KEY is not set")
    }

    console.log("[ImageVision] Processing image with Gemini Flash:", filePath)
    console.log("[ImageVision] GEMINI_API_KEY present:", !!apiKey, "length:", apiKey.length)

    // ファイル読み込み
    let buffer: Buffer
    try {
      buffer = await readFile(filePath)
      console.log("[ImageVision] File read successfully, size:", buffer.length, "bytes")
    } catch (readError) {
      console.error("[ImageVision] Failed to read file:", readError)
      console.error("[ImageVision] File path attempted:", filePath)
      throw new Error(`ファイルの読み込みに失敗しました: ${readError instanceof Error ? readError.message : "unknown error"}`)
    }

    const base64 = buffer.toString("base64")
    const ext = path.extname(filePath)
    const mimeType = getMimeType(ext)

    console.log("[ImageVision] Image loaded, size:", buffer.length, "bytes, type:", mimeType, "ext:", ext)
    console.log("[ImageVision] Base64 length:", base64.length)

    const genai = new GoogleGenAI({ apiKey })

    // Gemini API呼び出し
    console.log("[ImageVision] Calling Gemini API with model: gemini-2.0-flash")
    let response
    try {
      response = await genai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: `この画像に含まれる全てのテキストを抽出してください。

出力形式:
- Markdown形式で出力してください
- 見出し、本文、リストなど、文書構造を可能な限り再現してください
- 表がある場合はMarkdownテーブル形式で出力してください
- 読み取れない文字がある場合は [判読不能] と記載してください
- テキスト以外の要素（ロゴ、写真など）は無視してください`,
          },
        ],
      })
      console.log("[ImageVision] Gemini API response received successfully")
    } catch (apiError) {
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError)
      console.error("[ImageVision] Gemini API error:", apiError)
      console.error("[ImageVision] Gemini API error message:", errorMessage)
      console.error("[ImageVision] Request details - mimeType:", mimeType, "base64 length:", base64.length)
      throw new Error(`Gemini APIエラー: ${errorMessage}`)
    }

    const markdown = response.text || ""

    console.log("[ImageVision] Gemini Flash extraction completed, markdown length:", markdown.length)

    return {
      markdown,
      metadata: {
        pageCount: 1,
      },
      pages: [
        {
          pageNumber: 1,
          content: markdown,
        },
      ],
    }
  } catch (error) {
    console.error("[ImageVision] Error:", error)
    throw error
  }
}

// ============================================
// PII Masking - Claude による個人情報検出・マスキング
// ============================================

const PII_MASKING_PROMPT = `以下のテキストから個人情報（PII）を検出してください。

## 検出対象:
- PERSON: 人名（姓名、ニックネーム）
- PHONE_NUMBER: 電話番号
- EMAIL_ADDRESS: メールアドレス
- ADDRESS: 住所、所在地
- CREDIT_CARD: クレジットカード番号
- DATE_TIME: 生年月日、具体的な日時
- ORGANIZATION: 会社名、組織名
- IP_ADDRESS: IPアドレス

## 入力テキスト:
{text}

## 出力形式 (JSON):
{
  "detectedEntities": [
    {
      "type": "PERSON" | "PHONE_NUMBER" | "EMAIL_ADDRESS" | "ADDRESS" | "CREDIT_CARD" | "DATE_TIME" | "ORGANIZATION" | "IP_ADDRESS",
      "text": "検出されたテキスト",
      "start": 開始位置（文字インデックス）,
      "end": 終了位置（文字インデックス）,
      "score": 確信度（0.0-1.0）
    }
  ]
}

注意:
- 確実にPIIと判断できるもののみを検出してください
- 一般的な用語（「お客様」など）は除外してください
- 日本語特有の表記にも対応してください
- 必ず有効なJSONのみを出力してください`

// Entity type to placeholder mapping
const ENTITY_PLACEHOLDERS: Record<string, string> = {
  PERSON: "<PERSON>",
  LOCATION: "<ADDRESS>",
  ADDRESS: "<ADDRESS>",
  PHONE_NUMBER: "<PHONE>",
  EMAIL_ADDRESS: "<EMAIL>",
  CREDIT_CARD: "<CREDIT_CARD>",
  DATE_TIME: "<DATE>",
  ORGANIZATION: "<ORG>",
  IP_ADDRESS: "<IP>",
}

/**
 * Run the pii-masking agent using Claude
 * Detects and masks personal information
 */
export async function runPiiMasking(
  text: string,
  scoreThreshold: number = 0.7
): Promise<PIIMaskingResult> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = PII_MASKING_PROMPT.replace("{text}", text)

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    })

    const content = response.content[0].type === "text" ? response.content[0].text : ""

    // Extract JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : content

    const parsed = JSON.parse(jsonStr)

    // Filter by score threshold
    const detectedEntities = (parsed.detectedEntities || []).filter(
      (e: { score: number }) => e.score >= scoreThreshold
    )

    // Sort by position (descending) for replacement
    const sortedEntities = [...detectedEntities].sort(
      (a: { start: number }, b: { start: number }) => b.start - a.start
    )

    // Create masked text
    let maskedText = text
    for (const entity of sortedEntities) {
      const placeholder = ENTITY_PLACEHOLDERS[entity.type] || `<${entity.type}>`
      maskedText =
        maskedText.substring(0, entity.start) +
        placeholder +
        maskedText.substring(entity.end)
    }

    // Calculate statistics
    const byType: Record<string, number> = {}
    for (const entity of detectedEntities) {
      byType[entity.type] = (byType[entity.type] || 0) + 1
    }

    return {
      maskedText,
      detectedEntities,
      statistics: {
        totalDetected: detectedEntities.length,
        byType,
      },
    }
  } catch (error) {
    console.error("PII masking error:", error)
    return {
      maskedText: text,
      detectedEntities: [],
      statistics: { totalDetected: 0, byType: {} },
    }
  }
}

// ============================================
// PDF Highlight - pdfjs-dist による位置検索
// ============================================

/**
 * Normalize text for Japanese search
 */
function normalizeText(text: string): string {
  // Unicode normalization (NFKC)
  const normalized = text.normalize("NFKC")
  // Remove whitespace
  return normalized.replace(/\s+/g, "").toLowerCase()
}

/**
 * Run the pdf-highlight agent using pdfjs-dist
 * Finds text positions in PDF for highlighting
 */
export async function runPdfHighlight(
  filePath: string,
  searchItems: PdfHighlightInput["searchItems"]
): Promise<PdfHighlightOutput> {
  try {
    console.log("[PdfHighlight] Processing:", filePath)
    console.log("[PdfHighlight] Search items count:", searchItems.length)

    // Read PDF file and convert Buffer to Uint8Array for pdfjs-dist compatibility
    const buffer = await readFile(filePath)
    const data = new Uint8Array(buffer)
    const pdfDocument = await pdfjs.getDocument({ data }).promise

    const pageCount = pdfDocument.numPages
    console.log("[PdfHighlight] PDF loaded, pages:", pageCount)

    const highlights: PdfHighlightOutput["highlights"] = []
    const notFound: string[] = []

    // Build page text content cache
    const pageTextContents: Array<{
      text: string
      normalizedText: string
      items: Array<{
        str: string
        transform: number[]
        width: number
        height: number
      }>
      viewport: { width: number; height: number }
    }> = []

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.0 })
      const textContent = await page.getTextContent()

      const items = textContent.items
        .filter((item) => "str" in item)
        .map((item) => ({
          str: (item as { str: string }).str,
          transform: (item as { transform: number[] }).transform,
          width: (item as { width: number }).width,
          height: (item as { height: number }).height,
        }))

      const fullText = items.map((item) => item.str).join("")
      const normalizedFullText = normalizeText(fullText)

      pageTextContents.push({
        text: fullText,
        normalizedText: normalizedFullText,
        items,
        viewport: { width: viewport.width, height: viewport.height },
      })
    }

    // Search for each item
    for (const item of searchItems) {
      const searchText = item.text
      const normalizedSearch = normalizeText(searchText)
      const positions: PdfHighlightOutput["highlights"][0]["positions"] = []

      console.log(`[PdfHighlight] Searching for: '${searchText}'`)

      for (let pageIdx = 0; pageIdx < pageTextContents.length; pageIdx++) {
        const pageContent = pageTextContents[pageIdx]
        const pageNum = pageIdx + 1

        // Check if text exists on this page
        if (pageContent.normalizedText.includes(normalizedSearch)) {
          console.log(`[PdfHighlight] Found on page ${pageNum}`)

          // Find approximate position by iterating through text items
          let currentPos = 0
          for (const textItem of pageContent.items) {
            const itemNormalized = normalizeText(textItem.str)

            if (itemNormalized.includes(normalizedSearch)) {
              // Found! Calculate normalized position
              const transform = textItem.transform
              const x = transform[4]
              const y = transform[5]

              positions.push({
                pageNumber: pageNum,
                x0: x / pageContent.viewport.width,
                y0: 1 - (y / pageContent.viewport.height), // Invert Y
                x1: (x + textItem.width) / pageContent.viewport.width,
                y1: 1 - ((y - textItem.height) / pageContent.viewport.height),
              })
            }

            currentPos += textItem.str.length
          }

          // If no exact match in items, try to find in concatenated text
          if (positions.length === 0 && pageContent.text.toLowerCase().includes(searchText.toLowerCase())) {
            // Fallback: use first text item position as approximation
            const firstItem = pageContent.items[0]
            if (firstItem) {
              const transform = firstItem.transform
              positions.push({
                pageNumber: pageNum,
                x0: transform[4] / pageContent.viewport.width,
                y0: 1 - (transform[5] / pageContent.viewport.height),
                x1: (transform[4] + 100) / pageContent.viewport.width,
                y1: 1 - ((transform[5] - 20) / pageContent.viewport.height),
              })
            }
          }
        }
      }

      if (positions.length > 0) {
        highlights.push({
          id: item.id,
          type: item.type,
          text: item.text,
          severity: item.severity,
          reason: item.reason,
          suggestedFix: item.suggestedFix,
          positions,
        })
      } else {
        notFound.push(item.text)
        console.log(`[PdfHighlight] NOT FOUND: '${item.text}'`)
      }
    }

    console.log(`[PdfHighlight] Result: ${highlights.length} highlights, ${notFound.length} not found`)

    return {
      highlights,
      notFound,
      pageCount,
    }
  } catch (error) {
    console.error("PDF highlight error:", error)
    return {
      highlights: [],
      notFound: searchItems.map((item) => item.text),
      pageCount: 0,
    }
  }
}

// ============================================
// Generic Agent Runner
// ============================================

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

// ============================================
// Pipeline Functions
// ============================================

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
 * Supports both PDF files and image files (PNG, JPG, JPEG, WebP, GIF)
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
  const isImage = isImageFile(filePath)

  console.log(`[Pipeline] Processing ${isImage ? "image" : "PDF"} file:`, filePath)

  // Step 1: Visual Parse (PDF → Markdown) or Image Vision (Image → Markdown)
  onStatusChange?.("visual-parse")
  const parsed = isImage
    ? await runImageVision(filePath)  // Claude マルチモーダル
    : await runVisualParse(filePath)  // LlamaParse

  // 解析結果が空の場合はエラー
  if (!parsed.markdown || parsed.markdown.trim() === "") {
    const fileType = isImage ? "画像" : "PDF"
    throw new Error(`${fileType}からテキストを抽出できませんでした。ファイル形式を確認するか、再度アップロードしてください。`)
  }

  console.log("[Pipeline] Document parsed successfully, markdown length:", parsed.markdown.length)

  // Step 2: PII Masking
  onStatusChange?.("pii-masking")
  const masked = await runPiiMasking(parsed.markdown)

  // Step 3: Fast Check
  onStatusChange?.("fast-check")
  const fastCheck = await runFastCheck(masked.maskedText)

  // Step 4: PDF Highlight - NGワードとPIIの位置を特定（PDFのみ）
  let pdfHighlight: PdfHighlightOutput

  if (isImage) {
    // 画像ファイルの場合はハイライト位置特定をスキップ
    console.log("[Pipeline] Skipping PDF highlight for image file")
    pdfHighlight = {
      highlights: [],
      notFound: [],
      pageCount: 1,
    }
  } else {
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

    pdfHighlight = await runPdfHighlight(filePath, searchItems)
    console.log("[Pipeline] PDF highlight completed:", {
      found: pdfHighlight.highlights.length,
      notFound: pdfHighlight.notFound.length,
    })
  }

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
