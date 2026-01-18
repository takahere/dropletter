import { runImageVision, isImageFile } from "../src/lib/agents/runner"

async function main() {
  const testFile = "./assets/sample/信用金庫.png"
  console.log("Testing file:", testFile)
  console.log("isImageFile:", isImageFile(testFile))
  console.log("GEMINI_API_KEY set:", Boolean(process.env.GEMINI_API_KEY))

  console.log("\n[Testing runImageVision with Gemini Flash...]")

  try {
    const result = await runImageVision(testFile)
    console.log("\n✅ SUCCESS!")
    console.log("Markdown length:", result.markdown.length)
    console.log("Page count:", result.metadata.pageCount)
    console.log("\n--- First 800 chars of extracted text ---")
    console.log(result.markdown.substring(0, 800))
  } catch (err) {
    console.error("\n❌ ERROR:", err instanceof Error ? err.message : err)
    if (err instanceof Error) {
      console.error(err.stack)
    }
  }
}

main()
