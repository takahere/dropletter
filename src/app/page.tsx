"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Sparkles, Trash2 } from "lucide-react"
import { UploadZone } from "@/components/command-center/upload-zone"
import { FileSidebar } from "@/components/command-center/file-sidebar"
import { FileResultCard } from "@/components/command-center/file-result-card"
import { useProcessingStatus } from "@/hooks/use-processing-status"
import { useFileStore } from "@/lib/stores/file-store"

export default function Home() {
  // ハイドレーション対策: クライアント側でマウント後のみレンダリング
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 処理中ファイルのステータスをポーリング
  useProcessingStatus()

  const files = useFileStore((state) => state.files)
  const clearCompleted = useFileStore((state) => state.clearCompleted)
  const clearAll = useFileStore((state) => state.clearAll)
  const retryFile = useFileStore((state) => state.retryFile)

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  // ファイルカードへのスクロール用ref
  const mainContentRef = useRef<HTMLDivElement>(null)

  const hasCompletedFiles = files.some(
    (file) => file.processingStatus === "complete"
  )

  // サイドバーでファイルをクリックした時のハンドラ
  const handleFileClick = useCallback((fileId: string) => {
    setSelectedFileId(fileId)
    // 対象のファイルカードにスクロール
    const element = document.getElementById(`file-${fileId}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [])

  // マウント前はローディング表示
  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF3300] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">DropLetter</h1>
                <p className="text-xs text-muted-foreground">Command Center</p>
              </div>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      </main>
    )
  }

  // ファイルがない場合はヒーロー表示
  if (files.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF3300] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">DropLetter</h1>
                <p className="text-xs text-muted-foreground">Command Center</p>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              ファイルをドロップするだけ
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              複数ファイルを同時に解析。AIが自動で法的チェック・匿名化まで完了します。
            </p>
          </div>

          <UploadZone compact={false} />

          {/* 機能説明 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {[
              {
                title: "並列処理",
                desc: "複数ファイルを同時に解析",
              },
              {
                title: "高速解析",
                desc: "0.5秒でNGワードを検出",
              },
              {
                title: "詳細レポート",
                desc: "法的判定と修正案を生成",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-card border hover:-translate-y-1 hover:shadow-lg transition-all"
              >
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  // ファイルがある場合はサイドバー + メインコンテンツ
  return (
    <main className="h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm flex-shrink-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <button
            onClick={clearAll}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            title="ホームに戻る"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FF3300] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold">DropLetter</h1>
              <p className="text-xs text-muted-foreground">Command Center</p>
            </div>
          </button>

          <div className="flex items-center gap-4">
            {/* ファイル数表示 */}
            <span className="text-sm text-muted-foreground">
              {files.length} ファイル
            </span>

            {/* 完了済みを削除 */}
            {hasCompletedFiles && (
              <button
                onClick={clearCompleted}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                完了済みを削除
              </button>
            )}
          </div>
        </div>
      </header>

      {/* メインレイアウト: サイドバー + コンテンツ */}
      <div className="flex-1 flex min-h-0">
        {/* サイドバー - 固定表示 */}
        <aside className="w-64 border-r bg-card flex-shrink-0 flex flex-col h-full">
          <div className="p-4 border-b flex-shrink-0">
            <h2 className="font-semibold text-sm text-muted-foreground">
              ファイル一覧
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileSidebar
              onFileClick={handleFileClick}
              selectedFileId={selectedFileId}
            />
          </div>
        </aside>

        {/* メインコンテンツ */}
        <div
          ref={mainContentRef}
          className="flex-1 overflow-y-auto"
        >
          {/* アップロードゾーン - 常時表示 */}
          <div className="sticky top-0 z-10 p-4 bg-background/95 backdrop-blur-sm border-b">
            <UploadZone compact={true} />
          </div>

          {/* ファイルカード一覧 */}
          <div className="p-6 space-y-6">
            {files.map((file) => (
              <FileResultCard
                key={file.id}
                file={file}
                onRetry={() => retryFile(file.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
