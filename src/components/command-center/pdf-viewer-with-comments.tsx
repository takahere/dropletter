"use client"

import { useEffect, useState } from "react"
import { Loader2, FileText } from "lucide-react"
import { CommentsRoomProvider } from "@/components/liveblocks/room-provider"
import { PdfHighlighterViewer } from "./pdf-highlighter-viewer"
import { fetchInitialComments } from "@/lib/liveblocks/sync-comments"
import type { ProblemData } from "@/types/highlights"
import type { HighlightComment } from "@/types/comments"

// サーバーから受け取る事前計算済みハイライト
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

interface PdfViewerWithCommentsProps {
  reportId: string
  problems: ProblemData
  serverHighlights?: ServerHighlight[]
  className?: string
}

export function PdfViewerWithComments({
  reportId,
  problems,
  serverHighlights,
  className,
}: PdfViewerWithCommentsProps) {
  const [initialComments, setInitialComments] = useState<HighlightComment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchInitialComments(reportId)
      .then(setInitialComments)
      .finally(() => setIsLoading(false))
  }, [reportId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 rounded-2xl">
        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            コメントを読み込み中...
          </p>
        </div>
      </div>
    )
  }

  return (
    <CommentsRoomProvider reportId={reportId} initialComments={initialComments}>
      <PdfHighlighterViewer
        reportId={reportId}
        problems={problems}
        serverHighlights={serverHighlights}
        className={className}
      />
    </CommentsRoomProvider>
  )
}
