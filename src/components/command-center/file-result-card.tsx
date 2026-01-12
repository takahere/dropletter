"use client"

import { useState, useEffect, forwardRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  FileText,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  XCircle,
  RefreshCw,
  BookOpen,
  ExternalLink,
  FileCheck,
  Share2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { calculateScore, getScoreColor, getScoreBgColor } from "@/lib/utils/score"
import type { FileState } from "@/lib/stores/file-store"
import { inferGuidelineFromIssueType } from "@/lib/legal-guidelines"
import { ClearReportDialog } from "@/components/clear-report-dialog"

// PdfViewerWithComments を動的インポート（SSR無効）- Liveblocksリアルタイムコメント機能付き
const PdfViewerWithComments = dynamic(
  () => import("./pdf-viewer-with-comments").then((mod) => mod.PdfViewerWithComments),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 rounded-2xl">
        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          PDFビューアを読み込み中...
        </p>
      </div>
    ),
  }
)


interface FileResultCardProps {
  file: FileState
  onRetry?: () => void
}

interface ServerHighlight {
  id: string
  type: string
  text: string
  severity: string
  reason?: string
  suggestedFix?: string
  positions: Array<{
    pageNumber: number
    x0: number
    y0: number
    x1: number
    y1: number
  }>
}

interface Report {
  id: string
  file_name: string
  result_json: {
    parsed?: {
      markdown?: string
      metadata?: { pageCount?: number }
    }
    masked?: {
      maskedText?: string
      statistics?: { totalDetected?: number }
      detectedEntities?: Array<{ type: string; text: string; start?: number; end?: number }>
    }
    fastCheck?: {
      ngWords?: Array<{ word: string; severity: string; reason: string }>
    }
    highlights?: ServerHighlight[]  // サーバーで事前計算されたハイライト
    highlightsNotFound?: string[]    // 見つからなかったテキスト
    deepReason?: {
      legalJudgment?: {
        isCompliant?: boolean
        riskLevel?: string
        issues?: Array<{ type: string; description: string; location?: string; suggestedFix?: string }>
      }
      postalWorkerExplanation?: string
      summary?: string
    }
  }
}

// 処理ステータスの表示テキスト
const statusLabels: Record<string, string> = {
  idle: "待機中",
  pending: "キュー待ち",
  parsing: "PDF解析中",
  masking: "個人情報マスキング中",
  "fast-check": "NGワードチェック中",
  "deep-reason": "法的判定中",
  complete: "完了",
  error: "エラー",
}

export const FileResultCard = forwardRef<HTMLDivElement, FileResultCardProps>(
  function FileResultCard({ file, onRetry }, ref) {
    const [report, setReport] = useState<Report | null>(null)
    const [expandedSections, setExpandedSections] = useState({
      preview: true,
      ngWords: true,
      legalJudgment: true,
    })
    const [showClearReport, setShowClearReport] = useState(false)

    const isProcessing =
      file.processingStatus !== "idle" &&
      file.processingStatus !== "complete" &&
      file.processingStatus !== "error"
    const isComplete = file.processingStatus === "complete"
    const isError = file.processingStatus === "error"
    const score = calculateScore(file.result)

    // レポートを取得
    useEffect(() => {
      console.log("[FileResultCard] useEffect - reportId:", file.reportId, "isComplete:", isComplete)
      if (!file.reportId || !isComplete) {
        setReport(null)
        return
      }

      const fetchReport = async () => {
        try {
          console.log("[FileResultCard] Fetching report:", file.reportId)
          const response = await fetch(`/api/reports/${file.reportId}`)
          if (response.ok) {
            const data = await response.json()
            console.log("[FileResultCard] Report fetched:", {
              hasReport: !!data.report,
              hasFastCheck: !!data.report?.result_json?.fastCheck,
              ngWordsCount: data.report?.result_json?.fastCheck?.ngWords?.length || 0,
            })
            setReport(data.report)
          } else {
            console.error("[FileResultCard] Failed to fetch report:", response.status)
          }
        } catch (error) {
          console.error("Failed to fetch report:", error)
        }
      }

      fetchReport()
    }, [file.reportId, isComplete])

    const toggleSection = (section: keyof typeof expandedSections) => {
      setExpandedSections((prev) => ({
        ...prev,
        [section]: !prev[section],
      }))
    }

    return (
      <div
        ref={ref}
        id={`file-${file.id}`}
        className={cn(
          "border rounded-xl bg-card overflow-hidden",
          isComplete && "border-green-200",
          isError && "border-red-200",
          isProcessing && "border-blue-200"
        )}
      >
        {/* ヘッダー */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isComplete
                    ? getScoreBgColor(score)
                    : isError
                    ? "bg-red-100 dark:bg-red-900/30"
                    : "bg-muted"
                )}
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : isComplete ? (
                  <span className={cn("text-lg font-bold", getScoreColor(score))}>
                    {score}
                  </span>
                ) : isError ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-medium truncate max-w-md" title={file.fileName}>
                  {file.fileName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {(file.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            {/* スコア表示 */}
            {isComplete && file.result && (
              <div className="flex items-center gap-2">
                {file.result.ngWordsCount > 0 && (
                  <span className="flex items-center gap-1 text-sm text-yellow-600">
                    <AlertTriangle className="w-4 h-4" />
                    {file.result.ngWordsCount}件の問題
                  </span>
                )}
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-bold",
                    getScoreBgColor(score),
                    getScoreColor(score)
                  )}
                >
                  {score}点
                </span>
                {/* 共有ボタン */}
                {file.reportId && (
                  <Link
                    href={`/share/${file.reportId}`}
                    target="_blank"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    title="共有ページを開く"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">共有</span>
                  </Link>
                )}
                {/* クリアレポートボタン */}
                <button
                  onClick={() => setShowClearReport(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  title="法的クリアレポートを生成"
                >
                  <FileCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">レポート</span>
                </button>
              </div>
            )}

            {/* エラー時のリトライボタン */}
            {isError && onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                リトライ
              </button>
            )}
          </div>
        </div>

        {/* 処理中の表示 */}
        {isProcessing && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="font-medium">
                {statusLabels[file.processingStatus] || "処理中"}
              </span>
            </div>
            <Progress value={file.progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {file.progress}% 完了
            </p>
          </div>
        )}

        {/* エラー表示 */}
        {isError && (
          <div className="p-6">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">
                    処理エラー
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    {file.error || "処理中にエラーが発生しました"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 完了時のコンテンツ */}
        {isComplete && (
          <div className="divide-y">
            {/* ドキュメントプレビュー */}
            <div className="p-4">
              <button
                onClick={() => toggleSection("preview")}
                className="flex items-center gap-2 w-full text-left mb-4 group"
              >
                <div className={cn(
                  "p-1 rounded-md transition-colors",
                  "group-hover:bg-muted"
                )}>
                  {expandedSections.preview ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <span className="font-medium text-foreground/90">ドキュメントプレビュー</span>
              </button>
              {expandedSections.preview && (
                <div>
                  {file.reportId ? (
                    (() => {
                      const problems = {
                        ngWords: report?.result_json?.fastCheck?.ngWords || [],
                        piiEntities: report?.result_json?.masked?.detectedEntities || [],
                        legalIssues: report?.result_json?.deepReason?.legalJudgment?.issues || [],
                      }
                      console.log("[FileResultCard] Rendering PdfHighlighterViewer:", {
                        reportId: file.reportId,
                        hasReport: !!report,
                        ngWordsCount: problems.ngWords.length,
                        piiCount: problems.piiEntities.length,
                        legalCount: problems.legalIssues.length,
                        ngWords: problems.ngWords,
                      })
                      return (
                        <PdfViewerWithComments
                          reportId={file.reportId}
                          problems={problems}
                          serverHighlights={report?.result_json?.highlights}
                        />
                      )
                    })()
                  ) : (
                    <div className={cn(
                      "flex flex-col items-center justify-center py-16",
                      "bg-gradient-to-b from-slate-50 to-slate-100",
                      "dark:from-slate-900 dark:to-slate-950",
                      "rounded-2xl"
                    )}>
                      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        プレビューがありません
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NGワード */}
            {report?.result_json?.fastCheck?.ngWords &&
              report.result_json.fastCheck.ngWords.length > 0 && (
                <div className="p-4">
                  <button
                    onClick={() => toggleSection("ngWords")}
                    className="flex items-center gap-2 w-full text-left mb-2"
                  >
                    {expandedSections.ngWords ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      NGワード ({report.result_json.fastCheck.ngWords.length}件)
                    </span>
                  </button>
                  {expandedSections.ngWords && (
                    <div className="space-y-2">
                      {report.result_json.fastCheck.ngWords.map((ngWord, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                        >
                          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-yellow-800 dark:text-yellow-300">
                              「{ngWord.word}」
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                              {ngWord.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            {/* 法的判定 */}
            {report?.result_json?.deepReason?.legalJudgment && (
              <div className="p-4">
                <button
                  onClick={() => toggleSection("legalJudgment")}
                  className="flex items-center gap-2 w-full text-left mb-2"
                >
                  {expandedSections.legalJudgment ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span className="font-medium">法的判定</span>
                </button>
                {expandedSections.legalJudgment && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        リスクレベル:
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-sm font-medium",
                          report.result_json.deepReason.legalJudgment.riskLevel ===
                            "high" || report.result_json.deepReason.legalJudgment.riskLevel === "critical"
                            ? "bg-red-100 text-red-700"
                            : report.result_json.deepReason.legalJudgment.riskLevel ===
                              "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        )}
                      >
                        {report.result_json.deepReason.legalJudgment.riskLevel ||
                          "不明"}
                      </span>
                    </div>
                    {report.result_json.deepReason.summary && (
                      <p className="text-sm text-muted-foreground">
                        {report.result_json.deepReason.summary}
                      </p>
                    )}

                    {/* 法的問題の詳細とガイドラインリンク */}
                    {report.result_json.deepReason.legalJudgment.issues &&
                      report.result_json.deepReason.legalJudgment.issues.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                          <BookOpen className="w-4 h-4" />
                          <span>検出された法的問題</span>
                        </div>
                        {report.result_json.deepReason.legalJudgment.issues.map((issue, index) => {
                          const guideline = inferGuidelineFromIssueType(issue.type)
                          return (
                            <div
                              key={index}
                              className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-medium text-amber-800 dark:text-amber-300">
                                    {issue.type}
                                  </p>
                                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                    {issue.description}
                                  </p>
                                  {issue.suggestedFix && (
                                    <p className="text-sm text-green-700 dark:text-green-400 mt-2 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                      修正案: {issue.suggestedFix}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {/* ガイドラインリンク */}
                              {guideline && (
                                <a
                                  href={guideline.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                >
                                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                                  <span className="flex-1">
                                    公式ガイドラインを確認（{guideline.authority}）
                                  </span>
                                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                </a>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 待機中の表示 */}
        {file.processingStatus === "idle" && (
          <div className="p-6 text-center">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              処理が開始されるのを待っています
            </p>
          </div>
        )}

        {/* クリアレポートダイアログ */}
        {file.reportId && (
          <ClearReportDialog
            reportId={file.reportId}
            fileName={file.fileName}
            isOpen={showClearReport}
            onClose={() => setShowClearReport(false)}
          />
        )}
      </div>
    )
  }
)
