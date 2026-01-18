/**
 * PDFを信書ガイドラインMarkdownに変換するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/convert-shinsho-pdfs.ts
 */

import { writeFile, readFile } from "fs/promises"
import path from "path"

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function convertPdfToMarkdown(filePath: string, apiKey: string): Promise<string> {
  console.log(`\n[Converting] ${path.basename(filePath)}`)

  // Step 1: Upload the PDF file
  const fileBuffer = await readFile(filePath)
  const blob = new Blob([fileBuffer], { type: "application/pdf" })
  const formData = new FormData()
  formData.append("file", blob, path.basename(filePath))
  formData.append("language", "ja")

  console.log("  Uploading to LlamaParse...")

  const uploadResponse = await fetch(`${LLAMAPARSE_API_BASE}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`)
  }

  const uploadResult = (await uploadResponse.json()) as LlamaParseJobResponse
  const jobId = uploadResult.id
  console.log(`  Job created: ${jobId}`)

  // Step 2: Poll for job completion
  let status: LlamaParseStatusResponse["status"] = "PENDING"
  const maxAttempts = 120 // 10 minutes max
  let attempts = 0

  while (status === "PENDING" && attempts < maxAttempts) {
    await sleep(5000)
    attempts++

    const statusResponse = await fetch(`${LLAMAPARSE_API_BASE}/job/${jobId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    })

    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusResponse.status}`)
    }

    const statusResult = (await statusResponse.json()) as LlamaParseStatusResponse
    status = statusResult.status
    console.log(`  Status: ${status} (attempt ${attempts})`)
  }

  if (status !== "SUCCESS" && status !== "PARTIAL_SUCCESS") {
    throw new Error(`Job failed with status: ${status}`)
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
    throw new Error(`Result fetch failed: ${resultResponse.status}`)
  }

  const resultData = (await resultResponse.json()) as LlamaParseResultResponse
  console.log(`  Markdown retrieved: ${resultData.markdown.length} characters`)

  return resultData.markdown
}

async function main() {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY
  if (!apiKey) {
    console.error("Error: LLAMA_CLOUD_API_KEY environment variable is required")
    process.exit(1)
  }

  const assetsDir = path.join(process.cwd(), "assets")
  const outputDir = path.join(process.cwd(), "src/data/shinsho-guidelines")

  const pdfFiles = [
    {
      input: "【信書】信書に該当する文書に関する指針 (1).pdf",
      output: "guideline-main.md",
      description: "総務省基本ガイドライン",
    },
    {
      input: "【総務省】信書の定義→ガイドライン (1).pdf",
      output: "guideline-definition.md",
      description: "信書の定義詳細",
    },
    {
      input: "【郵政（内部資料）】修正信書に関する事例集2019初版1～79_JＰ (1).pdf",
      output: "guideline-examples.md",
      description: "信書事例集",
    },
  ]

  console.log("=== 信書ガイドラインPDF変換スクリプト ===\n")

  for (const file of pdfFiles) {
    const inputPath = path.join(assetsDir, file.input)
    const outputPath = path.join(outputDir, file.output)

    try {
      const markdown = await convertPdfToMarkdown(inputPath, apiKey)

      // Add header to markdown
      const header = `# ${file.description}\n\n> Source: ${file.input}\n> Generated: ${new Date().toISOString()}\n\n---\n\n`
      const fullContent = header + markdown

      await writeFile(outputPath, fullContent, "utf-8")
      console.log(`  Saved to: ${file.output}`)
    } catch (error) {
      console.error(`  Error processing ${file.input}:`, error)
    }
  }

  console.log("\n=== 変換完了 ===")
}

main().catch(console.error)
