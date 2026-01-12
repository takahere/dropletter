import guidelinesData from "@/data/legal-guidelines.json"

export interface LegalGuideline {
  id: string
  name: string
  authority: string
  url: string
  statute: string
  description: string
  keywords: string[]
}

export interface GuidelinesData {
  guidelines: LegalGuideline[]
}

// ガイドラインデータ
export const legalGuidelines = guidelinesData as GuidelinesData

// IDからガイドラインを取得
export function getGuidelineById(id: string): LegalGuideline | undefined {
  return legalGuidelines.guidelines.find((g) => g.id === id)
}

// キーワードからガイドラインを検索
export function findGuidelinesByKeyword(keyword: string): LegalGuideline[] {
  const lowerKeyword = keyword.toLowerCase()
  return legalGuidelines.guidelines.filter((g) =>
    g.keywords.some((k) => k.toLowerCase().includes(lowerKeyword)) ||
    g.name.toLowerCase().includes(lowerKeyword) ||
    g.description.toLowerCase().includes(lowerKeyword)
  )
}

// 法的問題タイプからガイドラインを推定
export function inferGuidelineFromIssueType(issueType: string): LegalGuideline | undefined {
  const typeToGuidelineMap: Record<string, string> = {
    // 信書関連
    "shinsho": "shinsho",
    "信書": "shinsho",
    "postal_letter": "shinsho",

    // 特定商取引法関連
    "tokushoho": "tokushoho",
    "特商法": "tokushoho",
    "通信販売": "tokushoho",
    "クーリングオフ": "tokushoho",

    // 景品表示法関連
    "keihinhyo": "keihinhyo",
    "景表法": "keihinhyo",
    "誇大広告": "keihinhyo",
    "優良誤認": "keihinhyo",
    "有利誤認": "keihinhyo",

    // 個人情報保護法関連
    "kojinjouhou": "kojinjouhou",
    "個人情報": "kojinjouhou",
    "pii": "kojinjouhou",
    "privacy": "kojinjouhou",

    // 薬機法関連
    "yakujihou": "yakujihou",
    "薬機法": "yakujihou",
    "効能効果": "yakujihou",

    // 著作権関連
    "chosakuken": "chosakuken",
    "著作権": "chosakuken",
    "copyright": "chosakuken",

    // 消費者契約法関連
    "shohishahou": "shohishahou",
    "消費者契約": "shohishahou",
    "契約条項": "shohishahou",
  }

  const guidelineId = typeToGuidelineMap[issueType]
  if (guidelineId) {
    return getGuidelineById(guidelineId)
  }

  // マッチしない場合はキーワード検索を試行
  const matchedGuidelines = findGuidelinesByKeyword(issueType)
  return matchedGuidelines.length > 0 ? matchedGuidelines[0] : undefined
}

// 全ガイドライン一覧を取得
export function getAllGuidelines(): LegalGuideline[] {
  return legalGuidelines.guidelines
}
