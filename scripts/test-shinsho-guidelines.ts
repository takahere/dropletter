/**
 * 信書ガイドライン読み込みテスト
 *
 * 使用方法:
 *   npx tsx scripts/test-shinsho-guidelines.ts
 */

import { loadShinshoGuidelines, getShinshoGuidelineForPrompt } from "../src/lib/legal-guidelines"

async function main() {
  console.log("=== 信書ガイドライン読み込みテスト ===\n")

  try {
    // Test 1: Load all guidelines
    console.log("1. Loading all shinsho guidelines...")
    const guidelines = await loadShinshoGuidelines()

    console.log("   Main guideline length:", guidelines.main.length, "characters")
    console.log("   Definition length:", guidelines.definition.length, "characters")
    console.log("   Examples length:", guidelines.examples.length, "characters")

    // Test 2: Get prompt version
    console.log("\n2. Getting prompt version (without examples)...")
    const promptNoExamples = await getShinshoGuidelineForPrompt(false)
    console.log("   Prompt length (no examples):", promptNoExamples.length, "characters")

    console.log("\n3. Getting prompt version (with examples)...")
    const promptWithExamples = await getShinshoGuidelineForPrompt(true)
    console.log("   Prompt length (with examples):", promptWithExamples.length, "characters")

    // Test 3: Show preview
    console.log("\n4. Preview (first 500 characters of prompt):")
    console.log("---")
    console.log(promptNoExamples.substring(0, 500))
    console.log("...")
    console.log("---")

    console.log("\n=== テスト完了 ===")
  } catch (error) {
    console.error("Error:", error)
    process.exit(1)
  }
}

main()
