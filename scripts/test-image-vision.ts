import path from "path"
import { readFileSync } from "fs"

// Load environment variables manually
const envContent = readFileSync(path.join(process.cwd(), ".env.local"), "utf-8")
for (const line of envContent.split("\n")) {
  const [key, ...valueParts] = line.split("=")
  if (key && !key.startsWith("#")) {
    process.env[key.trim()] = valueParts.join("=").trim()
  }
}

async function testImageVision() {
  const { runImageVision, isImageFile } = await import("@/lib/agents/runner")

  const testFiles = [
    "assets/sample/信用金庫.png",
    "assets/sample/明治.jpg",
    "assets/sample/百貨店.jpg",
    "assets/sample/不動産.webp",
  ]

  for (const relativePath of testFiles) {
    const filePath = path.join(process.cwd(), relativePath)
    console.log("\n" + "=".repeat(50))
    console.log(`Testing: ${relativePath}`)
    console.log(`Full path: ${filePath}`)
    console.log(`Is image: ${isImageFile(filePath)}`)

    try {
      const start = Date.now()
      const result = await runImageVision(filePath)
      const elapsed = Date.now() - start
      console.log(`SUCCESS (${elapsed}ms)`)
      console.log(`Markdown length: ${result.markdown.length}`)
      console.log(`Preview: ${result.markdown.substring(0, 200)}...`)
    } catch (error) {
      console.error(`FAILED:`, error)
    }
  }
}

testImageVision().catch(console.error)
