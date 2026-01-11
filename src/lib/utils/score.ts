import type { FileResult, RiskLevel } from "@/lib/stores/file-store"

/**
 * スコア計算ロジック
 * 100点から減点方式
 */
export function calculateScore(result: FileResult | undefined): number {
  if (!result) return 100

  let score = 100

  // NGワード: 1件につき -5点 (最大-30点)
  score -= Math.min((result.ngWordsCount || 0) * 5, 30)

  // PII検出: 1件につき -2点 (最大-20点)
  score -= Math.min((result.piiDetected || 0) * 2, 20)

  // リスクレベル: medium=-10, high=-25, critical=-50
  const riskPenalty: Record<RiskLevel, number> = {
    none: 0,
    low: 0,
    medium: 10,
    high: 25,
    critical: 50,
  }
  score -= riskPenalty[result.riskLevel] || 0

  return Math.max(score, 0)
}

/**
 * スコアに応じた色を返す
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600"
  if (score >= 70) return "text-yellow-600"
  if (score >= 50) return "text-orange-500"
  return "text-red-600"
}

/**
 * スコアに応じた背景色を返す
 */
export function getScoreBgColor(score: number): string {
  if (score >= 90) return "bg-green-100 dark:bg-green-900/30"
  if (score >= 70) return "bg-yellow-100 dark:bg-yellow-900/30"
  if (score >= 50) return "bg-orange-100 dark:bg-orange-900/30"
  return "bg-red-100 dark:bg-red-900/30"
}
