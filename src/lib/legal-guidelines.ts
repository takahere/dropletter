import { readFile } from "fs/promises"
import path from "path"

// ============================================
// 信書ガイドライン専用モジュール
// ============================================

// 信書ガイドラインの基本情報
export interface ShinshoGuideline {
  id: string
  name: string
  authority: string
  url: string
  statute: string
  description: string
}

// 信書ガイドラインのMarkdownファイル
export interface ShinshoGuidelinesMarkdown {
  main: string // 基本ガイドライン (guideline-main.md)
  definition: string // 定義詳細 (guideline-definition.md)
  examples: string // 事例集 (guideline-examples.md)
}

// 信書ガイドライン基本情報（固定値）
export const shinshoGuidelineInfo: ShinshoGuideline = {
  id: "shinsho",
  name: "信書の定義",
  authority: "総務省",
  url: "https://www.soumu.go.jp/yusei/shinsho_guide.html",
  statute: "郵便法第4条第2項、信書便法第2条第1項",
  description: "信書に該当する/しない文書の判断基準",
}

// 後方互換性のための型エイリアス
export type LegalGuideline = ShinshoGuideline

// 後方互換性のための関数（信書ガイドラインのみ返す）
export function getGuidelineById(id: string): ShinshoGuideline | undefined {
  if (id === "shinsho") {
    return shinshoGuidelineInfo
  }
  return undefined
}

// 後方互換性のための関数（信書ガイドラインのみ返す）
export function inferGuidelineFromIssueType(
  issueType: string
): ShinshoGuideline | undefined {
  // 信書関連のキーワードのみ対応
  const shinshoKeywords = ["shinsho", "信書", "postal_letter", "郵便法", "信書便法"]
  if (shinshoKeywords.some((k) => issueType.toLowerCase().includes(k.toLowerCase()))) {
    return shinshoGuidelineInfo
  }
  return undefined
}

// 後方互換性のための関数（信書ガイドラインのみ返す）
export function getAllGuidelines(): ShinshoGuideline[] {
  return [shinshoGuidelineInfo]
}

// 後方互換性のための関数
export function findGuidelinesByKeyword(keyword: string): ShinshoGuideline[] {
  const lowerKeyword = keyword.toLowerCase()
  if (
    shinshoGuidelineInfo.name.toLowerCase().includes(lowerKeyword) ||
    shinshoGuidelineInfo.description.toLowerCase().includes(lowerKeyword)
  ) {
    return [shinshoGuidelineInfo]
  }
  return []
}

// ============================================
// 信書ガイドラインMarkdown読み込み
// ============================================

// キャッシュ用変数
let shinshoGuidelinesCache: ShinshoGuidelinesMarkdown | null = null

/**
 * 信書ガイドラインのMarkdownファイルを読み込む
 * Node.js環境（サーバーサイド）でのみ動作
 */
export async function loadShinshoGuidelines(): Promise<ShinshoGuidelinesMarkdown> {
  // キャッシュがあれば返す
  if (shinshoGuidelinesCache) {
    return shinshoGuidelinesCache
  }

  const basePath = path.join(process.cwd(), "src/data/shinsho-guidelines")

  try {
    const [main, definition, examples] = await Promise.all([
      readFile(path.join(basePath, "guideline-main.md"), "utf-8"),
      readFile(path.join(basePath, "guideline-definition.md"), "utf-8"),
      readFile(path.join(basePath, "guideline-examples.md"), "utf-8"),
    ])

    shinshoGuidelinesCache = { main, definition, examples }
    return shinshoGuidelinesCache
  } catch (error) {
    console.error("Failed to load shinsho guidelines:", error)
    throw new Error("信書ガイドラインの読み込みに失敗しました")
  }
}

/**
 * 信書ガイドラインの概要を取得（プロンプト用）
 * main + definition を結合して返す（事例集は大きすぎるため除外可能）
 */
export async function getShinshoGuidelineForPrompt(
  includeExamples: boolean = false
): Promise<string> {
  const guidelines = await loadShinshoGuidelines()

  let content = `## 信書ガイドライン（総務省）\n\n`
  content += `### 基本ガイドライン\n${guidelines.main}\n\n`
  content += `### 信書の定義詳細\n${guidelines.definition}\n\n`

  if (includeExamples) {
    // 事例集は大きいので、一部のみ抜粋する
    const examplesPreview = guidelines.examples.substring(0, 20000)
    content += `### 信書事例集（抜粋）\n${examplesPreview}\n...(続く)\n\n`
  }

  return content
}

/**
 * 信書ガイドラインキャッシュをクリア
 */
export function clearShinshoGuidelinesCache(): void {
  shinshoGuidelinesCache = null
}

// ============================================
// 信書ガイドライン基本情報
// ============================================

// 信書ガイドラインを取得
export function getShinshoGuideline(): LegalGuideline | undefined {
  return getGuidelineById("shinsho")
}
