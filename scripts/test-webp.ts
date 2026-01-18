import { runDocumentPipeline, isImageFile } from "../src/lib/agents/runner"

async function main() {
  const testFile = "./assets/sample/不動産.webp"
  console.log("=== WebP Pipeline Test ===")
  console.log("Testing file:", testFile)
  console.log("isImageFile:", isImageFile(testFile))

  console.log("\n[Running full document pipeline...]")

  try {
    const result = await runDocumentPipeline(testFile, (status) => {
      console.log(`  Status: ${status}`)
    })

    console.log("\n✅ WEBP PIPELINE SUCCESS!")
    console.log("\n--- Results ---")
    console.log("Parsed markdown length:", result.parsed.markdown.length)
    console.log("PII entities detected:", result.masked.statistics.totalDetected)
    console.log("NG words found:", result.fastCheck.ngWords.length)
    console.log("Processing time:", result.totalProcessingTime, "ms")

    console.log("\n--- 信書判定結果 ---")
    if (result.deepReason.shinshoJudgment) {
      const sj = result.deepReason.shinshoJudgment
      console.log("信書該当:", sj.isShinsho ? "はい" : "いいえ")
      console.log("確信度:", sj.confidence)
      console.log("文書タイプ:", sj.documentType)
    }

    console.log("\n--- 抽出テキスト（先頭500文字）---")
    console.log(result.parsed.markdown.substring(0, 500))

  } catch (err) {
    console.error("\n❌ WEBP PIPELINE ERROR:", err instanceof Error ? err.message : err)
    if (err instanceof Error) {
      console.error(err.stack)
    }
  }
}

main()
