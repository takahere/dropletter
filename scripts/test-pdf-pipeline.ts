import { runDocumentPipeline } from "../src/lib/agents/runner"

async function main() {
  const testFile = "./test-letter.pdf"
  console.log("=== PDF Pipeline Test ===")
  console.log("Testing file:", testFile)

  console.log("\n[Running full document pipeline...]")

  try {
    const result = await runDocumentPipeline(testFile, (status) => {
      console.log(`  Status: ${status}`)
    })

    console.log("\n✅ PDF PIPELINE SUCCESS!")
    console.log("\n--- Results ---")
    console.log("Parsed markdown length:", result.parsed.markdown.length)
    console.log("Page count:", result.parsed.metadata.pageCount)
    console.log("PII entities detected:", result.masked.statistics.totalDetected)
    console.log("NG words found:", result.deepReason.ngWords.length)
    console.log("PDF highlights found:", result.pdfHighlight.highlights.length)
    console.log("Processing time:", result.totalProcessingTime, "ms")

    console.log("\n--- 信書判定結果 ---")
    if (result.deepReason.shinshoJudgment) {
      const sj = result.deepReason.shinshoJudgment
      console.log("信書該当:", sj.isShinsho ? "はい" : "いいえ")
      console.log("確信度:", sj.confidence)
      console.log("文書タイプ:", sj.documentType)
      console.log("理由:", sj.reason)
    }

  } catch (err) {
    console.error("\n❌ PDF PIPELINE ERROR:", err instanceof Error ? err.message : err)
    if (err instanceof Error) {
      console.error(err.stack)
    }
  }
}

main()
