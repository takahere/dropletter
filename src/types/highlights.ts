/**
 * PDF問題箇所ハイライトの型定義
 */

export type HighlightType = "ng_word" | "pii" | "legal_issue"

export type Severity = "low" | "medium" | "high" | "critical"

export interface HighlightRect {
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
  height: number
}

export interface HighlightPosition {
  pageNumber: number
  boundingRect: HighlightRect
  rects: HighlightRect[]
}

export interface HighlightComment {
  emoji: string
  text: string
  severity: Severity
  suggestedFix?: string
}

export interface ProblemHighlight {
  id: string
  type: HighlightType
  position: HighlightPosition
  content: {
    text: string
  }
  comment: HighlightComment
}

// 解析結果から受け取る問題データの型
export interface NGWord {
  word: string
  severity: string
  reason: string
  law?: string      // 該当する法律名（景品表示法/薬機法/特定商取引法など）
  position?: number // 旧形式との互換性のため残す
}

export interface PIIEntity {
  type: string
  text: string
  start?: number
  end?: number
  score?: number
}

export interface LegalIssue {
  type: string
  description: string
  location?: string
  suggestedFix?: string
}

export interface ProblemData {
  ngWords: NGWord[]
  piiEntities: PIIEntity[]
  legalIssues: LegalIssue[]
}
