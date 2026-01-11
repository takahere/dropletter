"use client"

import dynamic from "next/dynamic"
import { Loader2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface PdfViewerProps {
  reportId: string
  className?: string
}

// SSRを無効にしてreact-pdfを動的インポート
// 重要: react-pdfはブラウザAPIに依存するため、SSRを無効にする必要がある
const PdfViewerInternal = dynamic(
  () => import("./pdf-viewer-internal").then((mod) => mod.PdfViewerInternal),
  {
    ssr: false,
    loading: () => (
      <div
        className={cn(
          "relative flex flex-col items-center overflow-hidden rounded-2xl",
          "bg-gradient-to-b from-slate-100 to-slate-200",
          "dark:from-slate-800 dark:to-slate-900"
        )}
        style={{ height: "calc(100vh - 380px)", minHeight: "600px" }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
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
              PDFビューアを読み込んでいます
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              しばらくお待ちください...
            </p>
          </div>
        </div>
      </div>
    ),
  }
)

export function PdfViewer({ reportId, className }: PdfViewerProps) {
  return <PdfViewerInternal reportId={reportId} className={className} />
}
