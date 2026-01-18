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

// フォールバック用の埋め込みガイドライン（Vercel環境でファイル読み込みが失敗した場合に使用）
const FALLBACK_GUIDELINE_MAIN = `# 信書に該当する文書に関する指針

## 1 基本的な考え方

「信書」とは、「特定の受取人に対し、差出人の意思を表示し、又は事実を通知する文書」と郵便法及び信書便法に定義されています。

- 「特定の受取人」とは、差出人がその意思の表示又は事実の通知を受ける者として特に定めた者のことです。
- 「意思を表示し、又は事実を通知する」とは、差出人の考えや思いを表し、又は現実に起こり若しくは存在する事柄等の事実を伝えることです。
- 「文書」とは、文字、記号、符号等人の知覚によって認識することができる情報が記載された紙その他の有体物のことです。

## 2 信書に該当する文書の例

- **書状**: 手紙、はがき
- **請求書の類**: 納品書、領収書、見積書、願書、申込書、申請書、申告書、依頼書、契約書、照会書、回答書、承諾書
- **会議招集通知の類**: 結婚式等の招待状、業務を報告する文書
- **許可書の類**: 免許証、認定書、表彰状
- **証明書の類**: 印鑑証明書、納税証明書、戸籍謄本、住民票の写し
- **ダイレクトメール**: 文書自体に受取人が記載されている文書、商品の購入等利用関係を示す文言が記載されている文書

## 3 信書に該当しない文書の例

- **書籍の類**: 新聞、雑誌、会報、会誌、手帳、カレンダー、ポスター
- **カタログ**: 商品の目録としてのもの
- **チラシ・パンフレット**: 不特定多数向け
- **小切手の類**: 手形、株券、為替証書
- **プリペイドカード**: 商品券、図書券
- **乗車券の類**: 航空券、定期券、入場券
- **クレジットカードの類**: キャッシュカード、ローンカード
- **会員カードの類**: 入会証、ポイントカード、マイレージカード`

const FALLBACK_GUIDELINE_DEFINITION = `# 信書の定義詳細

## 信書とは

「信書」とは、「特定の受取人に対し、差出人の意思を表示し、又は事実を通知する文書」
（郵便法第4条第2項及び民間事業者による信書の送達に関する法律第2条第1項）

## 信書の概念が存在する理由

### 1. 基本的通信手段の確保
信書の送達は、国民の基本的通信手段であり、その役務を全国あまねく公平に提供する必要がある。

### 2. 憲法上保障された通信の秘密の確保
憲法では、表現の自由の確保及びプライバシー保護の観点から、基本的人権として「検閲の禁止」と併せて「通信の秘密」の保護を明記。

## ダイレクトメールの信書性

### 信書に該当するダイレクトメール
- 文書自体に個々の受取人が記載されている文書
- 商品の購入等利用関係があることを示す文言が記載されている文書
- 契約関係等差出人との間において特定の関係にある者への意思の表示又は事実の通知である旨の文言が記載されている文書

### 信書に該当しないダイレクトメール
- 内容が公然あるいは公開たりうる事実のみ
- 専ら街頭における配布や新聞折り込みを前提として作成されるチラシのようなもの
- 専ら店頭における配布を前提として作成されるパンフレットやリーフレットのようなもの`

/**
 * 信書ガイドラインのMarkdownファイルを読み込む
 * Node.js環境（サーバーサイド）でのみ動作
 * Vercel環境でファイルが見つからない場合はフォールバックコンテンツを使用
 */
export async function loadShinshoGuidelines(): Promise<ShinshoGuidelinesMarkdown> {
  // キャッシュがあれば返す
  if (shinshoGuidelinesCache) {
    return shinshoGuidelinesCache
  }

  // 複数のパスを試行（Vercel環境対応）
  const possiblePaths = [
    path.join(process.cwd(), "src/data/shinsho-guidelines"),
    path.join(process.cwd(), ".next/server/src/data/shinsho-guidelines"),
    "/var/task/src/data/shinsho-guidelines", // Vercel serverless function path
  ]

  for (const basePath of possiblePaths) {
    try {
      console.log(`[ShinshoGuidelines] Trying path: ${basePath}`)
      const [main, definition, examples] = await Promise.all([
        readFile(path.join(basePath, "guideline-main.md"), "utf-8"),
        readFile(path.join(basePath, "guideline-definition.md"), "utf-8"),
        readFile(path.join(basePath, "guideline-examples.md"), "utf-8"),
      ])

      console.log(`[ShinshoGuidelines] Successfully loaded from: ${basePath}`)
      shinshoGuidelinesCache = { main, definition, examples }
      return shinshoGuidelinesCache
    } catch (error) {
      console.log(`[ShinshoGuidelines] Failed to load from ${basePath}:`, error instanceof Error ? error.message : error)
      continue
    }
  }

  // すべてのパスで失敗した場合、フォールバックコンテンツを使用
  console.warn("[ShinshoGuidelines] Using fallback content (file loading failed)")
  shinshoGuidelinesCache = {
    main: FALLBACK_GUIDELINE_MAIN,
    definition: FALLBACK_GUIDELINE_DEFINITION,
    examples: "（事例集は省略されました）",
  }
  return shinshoGuidelinesCache
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
