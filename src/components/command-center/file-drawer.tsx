"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "ai/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useFileStore, useSelectedFile, useIsDrawerOpen } from "@/lib/stores/file-store"
import { ReportView } from "@/components/report-view"
import { Progress } from "@/components/ui/progress"
import {
  Send,
  Loader2,
  FileText,
  AlertCircle,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

interface Report {
  id: string
  file_name: string
  file_path?: string
  result_json: {
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
      ngWords?: Array<{ word: string; severity: string; reason: string }>
      processingTimeMs?: number
    }
    deepReason?: {
      legalJudgment?: {
        isCompliant?: boolean
        riskLevel?: string
        issues?: Array<{ type: string; description: string }>
      }
      postalWorkerExplanation?: string
      summary?: string
      processingTimeMs?: number
    }
    totalProcessingTime?: number
  }
  human_edits?: Array<{
    field: string
    original: string
    edited: string
    timestamp: string
  }>
  status: string
  created_at: string
  updated_at: string
}

export function FileDrawer() {
  const selectedFile = useSelectedFile()
  const isDrawerOpen = useIsDrawerOpen()
  const closeDrawer = useFileStore((state) => state.closeDrawer)

  const [report, setReport] = useState<Report | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [isChatExpanded, setIsChatExpanded] = useState(false)

  const chatContainerRef = useRef<HTMLDivElement>(null)

  // チャット機能
  const { messages, input, handleInputChange, handleSubmit, isLoading: isChatLoading } = useChat({
    api: "/api/chat",
    body: selectedFile?.reportId
      ? { reportId: selectedFile.reportId }
      : undefined,
    id: selectedFile?.reportId || selectedFile?.id,
  })

  // レポートデータを取得
  useEffect(() => {
    if (!selectedFile?.reportId) {
      setReport(null)
      return
    }

    const fetchReport = async () => {
      setIsLoadingReport(true)
      setReportError(null)

      try {
        const response = await fetch(`/api/reports/${selectedFile.reportId}`)
        if (!response.ok) {
          throw new Error("レポートの取得に失敗しました")
        }
        const data = await response.json()
        setReport(data)
      } catch (error) {
        setReportError(error instanceof Error ? error.message : "エラーが発生しました")
      } finally {
        setIsLoadingReport(false)
      }
    }

    fetchReport()
  }, [selectedFile?.reportId, selectedFile?.processingStatus])

  // チャットメッセージが追加されたらスクロール
  useEffect(() => {
    if (chatContainerRef.current && isChatExpanded) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isChatExpanded])

  if (!selectedFile) return null

  const isProcessing =
    selectedFile.processingStatus !== "idle" &&
    selectedFile.processingStatus !== "complete" &&
    selectedFile.processingStatus !== "error"

  return (
    <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[600px] sm:max-w-[600px] p-0 flex flex-col"
      >
        {/* ヘッダー */}
        <SheetHeader className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <SheetTitle className="text-left text-base">
                  {selectedFile.fileName}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 処理中の表示 */}
          {isProcessing && (
            <div className="p-6 space-y-4 border-b">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-[#FF3300] animate-spin" />
                <span className="font-medium">
                  {statusLabels[selectedFile.processingStatus] || "処理中"}
                </span>
              </div>
              <Progress value={selectedFile.progress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {selectedFile.progress}% 完了
              </p>
            </div>
          )}

          {/* エラー表示 */}
          {selectedFile.processingStatus === "error" && (
            <div className="p-6 border-b">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">
                    処理エラー
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    {selectedFile.error || "処理中にエラーが発生しました"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* レポート表示 */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingReport ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              </div>
            ) : reportError ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  {reportError}
                </p>
              </div>
            ) : report ? (
              <ReportView report={report} editable />
            ) : selectedFile.processingStatus === "complete" && !selectedFile.reportId ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  レポートデータがありません
                </p>
              </div>
            ) : !isProcessing && selectedFile.processingStatus !== "error" ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  処理が完了するとレポートが表示されます
                </p>
              </div>
            ) : null}
          </div>

          {/* チャットセクション */}
          {selectedFile.reportId && (
            <div className="border-t bg-muted/30">
              {/* チャット展開トグル */}
              <button
                onClick={() => setIsChatExpanded(!isChatExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    このドキュメントについて質問する
                  </span>
                  {messages.length > 0 && (
                    <span className="px-2 py-0.5 bg-[#FF3300]/10 text-[#FF3300] text-xs rounded-full">
                      {messages.length}
                    </span>
                  )}
                </div>
                {isChatExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {/* チャット内容 */}
              <AnimatePresence>
                {isChatExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 300, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t"
                  >
                    {/* メッセージリスト */}
                    <div
                      ref={chatContainerRef}
                      className="h-[240px] overflow-y-auto p-4 space-y-4"
                    >
                      {messages.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-muted-foreground">
                            レポートの内容について質問できます
                          </p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={cn(
                              "flex",
                              message.role === "user" ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                                message.role === "user"
                                  ? "bg-[#FF3300] text-white"
                                  : "bg-muted"
                              )}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-4 py-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 入力フォーム */}
                    <form
                      onSubmit={handleSubmit}
                      className="p-3 border-t flex gap-2"
                    >
                      <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="質問を入力..."
                        className="flex-1 px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF3300]/50"
                        disabled={isChatLoading}
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() || isChatLoading}
                        className="px-4 py-2 bg-[#FF3300] text-white rounded-lg hover:bg-[#FF3300]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
