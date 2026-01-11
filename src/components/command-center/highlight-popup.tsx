"use client"

import { cn } from "@/lib/utils"
import type { ProblemHighlight, Severity, HighlightType } from "@/types/highlights"

interface HighlightPopupProps {
  highlight: ProblemHighlight
  className?: string
}

const severityConfig: Record<
  Severity,
  { bg: string; text: string; label: string }
> = {
  low: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-800 dark:text-yellow-200",
    label: "LOW",
  },
  medium: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-800 dark:text-orange-200",
    label: "MEDIUM",
  },
  high: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-200",
    label: "HIGH",
  },
  critical: {
    bg: "bg-red-200 dark:bg-red-900/50",
    text: "text-red-900 dark:text-red-100",
    label: "CRITICAL",
  },
}

const typeConfig: Record<HighlightType, { label: string; color: string }> = {
  ng_word: {
    label: "NGワード",
    color: "text-red-600 dark:text-red-400",
  },
  pii: {
    label: "個人情報",
    color: "text-blue-600 dark:text-blue-400",
  },
  legal_issue: {
    label: "法的問題",
    color: "text-amber-600 dark:text-amber-400",
  },
}

export function HighlightPopup({ highlight, className }: HighlightPopupProps) {
  const severity = severityConfig[highlight.comment.severity]
  const typeInfo = typeConfig[highlight.type]

  return (
    <div
      className={cn(
        "max-w-xs p-4 bg-white dark:bg-slate-800 rounded-xl shadow-2xl",
        "border border-slate-200 dark:border-slate-700",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        className
      )}
    >
      {/* ヘッダー: 絵文字 + タイプ + 重大度 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl" role="img" aria-label="icon">
          {highlight.comment.emoji}
        </span>
        <span className={cn("text-sm font-medium", typeInfo.color)}>
          {typeInfo.label}
        </span>
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-xs font-bold",
            severity.bg,
            severity.text
          )}
        >
          {severity.label}
        </span>
      </div>

      {/* 問題のテキスト */}
      <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
          検出テキスト:
        </p>
        <p className="text-sm font-mono text-slate-700 dark:text-slate-300 break-all">
          「{highlight.content.text}」
        </p>
      </div>

      {/* 説明 */}
      <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
        {highlight.comment.text}
      </p>

      {/* 修正案（ある場合） */}
      {highlight.comment.suggestedFix && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1 mb-2">
            <svg
              className="w-4 h-4 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs font-medium text-green-600 dark:text-green-400">
              修正案
            </p>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
            {highlight.comment.suggestedFix}
          </p>
        </div>
      )}
    </div>
  )
}

// ローディング用のプレースホルダー
export function HighlightPopupSkeleton() {
  return (
    <div className="max-w-xs p-4 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="w-12 h-4 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
  )
}
