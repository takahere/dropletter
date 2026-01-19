"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Shield,
  FileText,
  Clock,
  Share2,
  UserCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ShareDialog } from "./share-dialog"
import { HumanReviewRequestCard } from "./human-review-request"
import { ReportViewSkeleton } from "@/components/ui/skeleton"

// Types
interface NGWord {
  word: string
  severity: string
  reason: string
  law?: string // 該当する法律名（景品表示法/薬機法/特定商取引法など）
}

interface Issue {
  type: string
  description: string
}

interface ResultJson {
  parsed?: {
    markdown?: string
    metadata?: {
      pageCount?: number
    }
  }
  masked?: {
    maskedText?: string
    statistics?: {
      totalDetected?: number
    }
  }
  fastCheck?: {
    ngWords?: NGWord[]
    processingTimeMs?: number
  }
  deepReason?: {
    legalJudgment?: {
      isCompliant?: boolean
      riskLevel?: string
      issues?: Issue[]
    }
    postalWorkerExplanation?: string
    summary?: string
    processingTimeMs?: number
  }
  totalProcessingTime?: number
}

interface HumanEdit {
  field: string
  original: string
  edited: string
  timestamp: string
}

interface Report {
  id: string
  file_name: string
  file_path?: string
  result_json: ResultJson
  human_edits?: HumanEdit[]
  status: string
  created_at: string
  updated_at: string
}

interface ReportViewProps {
  report: Report
  editable?: boolean
}

export function ReportView({ report, editable = false }: ReportViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    masked: false,
    ngWords: true,
    legalJudgment: true,
    explanation: true,
    summary: true,
  })

  // result_jsonが空の場合のデフォルト値
  const result = report.result_json || {}
  const isProcessing = !result.fastCheck && !result.deepReason

  // 編集可能なデータ
  const [editedNgWords, setEditedNgWords] = useState<NGWord[]>(
    result.fastCheck?.ngWords || []
  )
  const [editedExplanation, setEditedExplanation] = useState(
    result.deepReason?.postalWorkerExplanation || ""
  )
  const [editedSummary, setEditedSummary] = useState(
    result.deepReason?.summary || ""
  )
  const [humanEdits, setHumanEdits] = useState<HumanEdit[]>(report.human_edits || [])
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // 編集を記録
  const recordEdit = useCallback((field: string, original: string, edited: string) => {
    if (original !== edited) {
      setHumanEdits((prev) => [
        ...prev,
        {
          field,
          original,
          edited,
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }, [])

  // NGワードを削除
  const removeNgWord = (index: number) => {
    const removed = editedNgWords[index]
    recordEdit("ngWords", JSON.stringify(removed), "削除")
    setEditedNgWords((prev) => prev.filter((_, i) => i !== index))
  }

  // NGワードを追加
  const addNgWord = () => {
    const newWord: NGWord = { word: "", severity: "medium", reason: "" }
    setEditedNgWords((prev) => [...prev, newWord])
  }

  // NGワードを更新
  const updateNgWord = (index: number, field: keyof NGWord, value: string) => {
    setEditedNgWords((prev) =>
      prev.map((w, i) => (i === index ? { ...w, [field]: value } : w))
    )
  }

  // 保存
  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus("saving")

    try {
      // 編集を記録
      const originalExplanation = report.result_json.deepReason?.postalWorkerExplanation || ""
      const originalSummary = report.result_json.deepReason?.summary || ""

      if (editedExplanation !== originalExplanation) {
        recordEdit("postalWorkerExplanation", originalExplanation, editedExplanation)
      }
      if (editedSummary !== originalSummary) {
        recordEdit("summary", originalSummary, editedSummary)
      }

      // 更新されたresult_jsonを構築
      const updatedResultJson: ResultJson = {
        ...result,
        fastCheck: {
          ...result.fastCheck,
          ngWords: editedNgWords,
        },
        deepReason: {
          ...result.deepReason,
          postalWorkerExplanation: editedExplanation,
          summary: editedSummary,
        },
      }

      const response = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultJson: updatedResultJson,
          humanEdits,
        }),
      })

      if (!response.ok) {
        throw new Error("保存に失敗しました")
      }

      setSaveStatus("saved")
      setIsEditing(false)
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (error) {
      console.error("Save error:", error)
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
    }
  }

  // セクションヘッダーコンポーネント
  const SectionHeader = ({
    title,
    section,
    icon: Icon,
    badge,
  }: {
    title: string
    section: string
    icon: React.ElementType
    badge?: React.ReactNode
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">{title}</span>
        {badge}
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  )

  // リスクレベルバッジ
  const RiskBadge = ({ level }: { level: string }) => {
    const colors = {
      low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    }
    const labels = { low: "低", medium: "中", high: "高" }
    return (
      <span className={cn("px-2 py-0.5 rounded text-xs font-medium", colors[level as keyof typeof colors] || colors.medium)}>
        {labels[level as keyof typeof labels] || level}
      </span>
    )
  }

  // 処理中の場合はスケルトン表示
  if (isProcessing) {
    return (
      <div className="space-y-6">
        <div className="bg-card border rounded-xl p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">{report.file_name}</h2>
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <div className="w-5 h-5 border-2 border-[#FF3300] border-t-transparent rounded-full animate-spin" />
            <span>処理中...</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            ドキュメントを解析しています。しばらくお待ちください。
          </p>
        </div>
        <ReportViewSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー情報 */}
      <div className="bg-card border rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold truncate">{report.file_name}</h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(report.created_at).toLocaleString("ja-JP")}
              </span>
              {result.totalProcessingTime && (
                <span>処理時間: {(result.totalProcessingTime / 1000).toFixed(1)}秒</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {editable && (
              <button
                onClick={() => setIsShareDialogOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">共有リンクを作成</span>
                <span className="sm:hidden">共有</span>
              </button>
            )}
            {editable && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">キャンセル</span>
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-[#FF3300] text-white hover:bg-[#FF3300]/90 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSaving ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">保存</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden sm:inline">編集</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
            <p className="text-xs sm:text-sm text-muted-foreground">リスクレベル</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">
              <RiskBadge level={result.deepReason?.legalJudgment?.riskLevel || "medium"} />
            </p>
          </div>
          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
            <p className="text-xs sm:text-sm text-muted-foreground">コンプライアンス</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">
              {result.deepReason?.legalJudgment?.isCompliant ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" /> 適合
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-500">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" /> 要確認
                </span>
              )}
            </p>
          </div>
          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
            <p className="text-xs sm:text-sm text-muted-foreground">NGワード</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">
              {editedNgWords.length}件
            </p>
          </div>
          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
            <p className="text-xs sm:text-sm text-muted-foreground">個人情報検出</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">
              {result.masked?.statistics?.totalDetected || 0}件
            </p>
          </div>
        </div>

        {/* 保存ステータス */}
        <AnimatePresence>
          {saveStatus !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "mt-4 p-3 rounded-lg text-sm",
                saveStatus === "saved" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                saveStatus === "error" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                saveStatus === "saving" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              )}
            >
              {saveStatus === "saved" && "保存しました"}
              {saveStatus === "error" && "保存に失敗しました"}
              {saveStatus === "saving" && "保存中..."}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 有人判定リクエスト */}
      <HumanReviewRequestCard reportId={report.id} editable={editable} />

      {/* マスキング済みテキスト */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <SectionHeader
          title="マスキング済みテキスト"
          section="masked"
          icon={FileText}
        />
        <AnimatePresence>
          {expandedSections.masked && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 border-t">
                <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg max-h-96 overflow-auto">
                  {result.masked?.maskedText || "テキストがありません"}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* NGワード */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <SectionHeader
          title="NGワード"
          section="ngWords"
          icon={AlertTriangle}
          badge={
            <span className={cn(
              "px-2 py-0.5 rounded text-xs",
              editedNgWords.length === 0
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {editedNgWords.length}件
            </span>
          }
        />
        <AnimatePresence>
          {expandedSections.ngWords && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 border-t space-y-3">
                {editedNgWords.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    NGワードは検出されませんでした
                  </p>
                ) : (
                  editedNgWords.map((ngWord, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1 space-y-2">
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={ngWord.word}
                              onChange={(e) => updateNgWord(index, "word", e.target.value)}
                              className="w-full px-3 py-2 bg-background border rounded-lg text-sm"
                              placeholder="NGワード"
                            />
                            <div className="flex flex-col sm:flex-row gap-2">
                              <select
                                value={ngWord.severity}
                                onChange={(e) => updateNgWord(index, "severity", e.target.value)}
                                className="px-3 py-2 bg-background border rounded-lg text-sm w-full sm:w-auto"
                              >
                                <option value="low">低</option>
                                <option value="medium">中</option>
                                <option value="high">高</option>
                              </select>
                              <input
                                type="text"
                                value={ngWord.reason}
                                onChange={(e) => updateNgWord(index, "reason", e.target.value)}
                                className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm"
                                placeholder="理由"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">「{ngWord.word}」</span>
                              <RiskBadge level={ngWord.severity} />
                              {ngWord.law && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  {ngWord.law}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {ngWord.reason}
                            </p>
                          </>
                        )}
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => removeNgWord(index)}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
                {isEditing && (
                  <button
                    onClick={addNgWord}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-lg transition-colors w-full justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    NGワードを追加
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 法的判定 */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <SectionHeader
          title="法的判定"
          section="legalJudgment"
          icon={Shield}
        />
        <AnimatePresence>
          {expandedSections.legalJudgment && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 border-t space-y-4">
                <h4 className="font-medium">問題点</h4>
                {result.deepReason?.legalJudgment?.issues?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    法的な問題点は検出されませんでした
                  </p>
                ) : (
                  <div className="space-y-2">
                    {result.deepReason?.legalJudgment?.issues?.map((issue, index) => (
                      <div
                        key={index}
                        className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                      >
                        <span className="font-medium text-yellow-700 dark:text-yellow-400">
                          {issue.type}:
                        </span>{" "}
                        <span className="text-sm">{issue.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 郵便局員向け説明 */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <SectionHeader
          title="郵便局員向け説明"
          section="explanation"
          icon={FileText}
        />
        <AnimatePresence>
          {expandedSections.explanation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 border-t">
                {isEditing ? (
                  <textarea
                    value={editedExplanation}
                    onChange={(e) => setEditedExplanation(e.target.value)}
                    className="w-full min-h-32 px-4 py-3 bg-muted rounded-lg text-sm resize-y"
                    placeholder="郵便局員向けの説明を入力..."
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {editedExplanation || "説明がありません"}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 要約 */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <SectionHeader
          title="要約"
          section="summary"
          icon={FileText}
        />
        <AnimatePresence>
          {expandedSections.summary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 border-t">
                {isEditing ? (
                  <textarea
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    className="w-full min-h-24 px-4 py-3 bg-muted rounded-lg text-sm resize-y"
                    placeholder="要約を入力..."
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {editedSummary || "要約がありません"}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 編集履歴 */}
      {humanEdits.length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <h3 className="font-medium mb-3">編集履歴</h3>
          <div className="space-y-2 text-sm">
            {humanEdits.map((edit, index) => (
              <div key={index} className="flex items-start gap-2 text-muted-foreground">
                <Edit2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">{edit.field}</span> を編集
                  <span className="text-xs ml-2">
                    {new Date(edit.timestamp).toLocaleString("ja-JP")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 共有ダイアログ */}
      <ShareDialog
        reportId={report.id}
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />
    </div>
  )
}
