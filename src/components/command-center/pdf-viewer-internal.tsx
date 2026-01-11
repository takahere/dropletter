"use client"

import { useState, useCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

// PDF.js worker設定 - publicディレクトリから読み込み
// 重要: workerSrcは同じモジュール内で設定する必要がある
// react-pdf@8.x + pdfjs-dist@3.x は .js ファイルを使用
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"

// CSS は globals.css でグローバルにインポート（動的インポートのタイミング問題を回避）

interface PdfViewerInternalProps {
  reportId: string
  className?: string
}

export function PdfViewerInternal({ reportId, className }: PdfViewerInternalProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pdfUrl = `/api/files/${reportId}`

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
  }, [])

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error("PDF load error:", err)
    setError("PDFの読み込みに失敗しました")
    setIsLoading(false)
  }, [])

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages))
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5))
  }

  const openInNewTab = () => {
    window.open(pdfUrl, "_blank")
  }

  const downloadPdf = () => {
    const link = document.createElement("a")
    link.href = pdfUrl
    link.download = "document.pdf"
    link.click()
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-2xl",
        "bg-gradient-to-b from-slate-100 to-slate-200",
        "dark:from-slate-800 dark:to-slate-900",
        className
      )}
    >
      {/* PDFコンテンツエリア */}
      <div
        className="relative w-full overflow-auto py-8 px-4"
        style={{ height: "calc(100vh - 380px)", minHeight: "600px" }}
      >
        {/* ローディング状態 */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-100 dark:bg-slate-800">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-700 shadow-xl flex items-center justify-center">
                <FileText className="w-10 h-10 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ドキュメントを読み込んでいます
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                しばらくお待ちください...
              </p>
            </div>
          </div>
        )}

        {/* エラー状態 */}
        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-100 dark:bg-slate-800">
            <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <FileText className="w-10 h-10 text-red-400" />
            </div>
            <div className="text-center max-w-sm">
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                読み込みに失敗しました
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {error}
              </p>
              <button
                onClick={openInNewTab}
                className={cn(
                  "inline-flex items-center gap-2 px-5 py-2.5",
                  "text-sm font-medium text-white",
                  "bg-blue-500 hover:bg-blue-600",
                  "rounded-xl shadow-md transition-all"
                )}
              >
                <Maximize2 className="w-4 h-4" />
                別タブで開く
              </button>
            </div>
          </div>
        )}

        {/* PDF Document */}
        {!error && (
          <div className="flex justify-center">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              className="flex flex-col items-center gap-6"
            >
              <div
                className={cn(
                  "bg-white dark:bg-slate-700 rounded-lg overflow-hidden",
                  "shadow-2xl ring-1 ring-slate-200/50 dark:ring-slate-600/50"
                )}
                style={{ position: 'relative' }}
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="max-w-full"
                  loading={
                    <div className="w-[595px] h-[842px] flex items-center justify-center bg-white dark:bg-slate-700">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    </div>
                  }
                />
              </div>
            </Document>
          </div>
        )}
      </div>

      {/* フローティングツールバー - 下部中央 */}
      {!isLoading && !error && numPages > 0 && (
        <div
          className={cn(
            "absolute bottom-6 left-1/2 -translate-x-1/2 z-20",
            "flex items-center gap-1 px-2 py-1.5",
            "bg-white/90 dark:bg-slate-800/90 backdrop-blur-md",
            "rounded-full shadow-2xl",
            "border border-slate-200/60 dark:border-slate-700/60"
          )}
        >
          {/* ページナビゲーション */}
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className={cn(
              "p-2 rounded-full transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            title="前のページ"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>

          <div className="px-3 py-1 min-w-[80px] text-center">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {currentPage}
            </span>
            <span className="text-sm text-slate-400 dark:text-slate-500"> / {numPages}</span>
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className={cn(
              "p-2 rounded-full transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            title="次のページ"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>

          {/* 区切り線 */}
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* ズームコントロール */}
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className={cn(
              "p-2 rounded-full transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            title="縮小"
          >
            <ZoomOut className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>

          <div className="px-2 py-1 min-w-[50px] text-center">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {Math.round(scale * 100)}%
            </span>
          </div>

          <button
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className={cn(
              "p-2 rounded-full transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            title="拡大"
          >
            <ZoomIn className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>

          {/* 区切り線 */}
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* アクションボタン */}
          <button
            onClick={openInNewTab}
            className={cn(
              "p-2 rounded-full transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
            title="新しいタブで開く"
          >
            <Maximize2 className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>

          <button
            onClick={downloadPdf}
            className={cn(
              "p-2 rounded-full transition-colors",
              "hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
            title="ダウンロード"
          >
            <Download className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      )}
    </div>
  )
}
