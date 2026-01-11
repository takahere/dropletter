"use client"

import { FileText, Loader2, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFileStore } from "@/lib/stores/file-store"
import { calculateScore, getScoreColor } from "@/lib/utils/score"
import type { FileState } from "@/lib/stores/file-store"

interface FileSidebarProps {
  onFileClick: (fileId: string) => void
  selectedFileId: string | null
}

function SidebarItem({
  file,
  isSelected,
  onClick,
}: {
  file: FileState
  isSelected: boolean
  onClick: () => void
}) {
  const isProcessing =
    file.processingStatus !== "idle" &&
    file.processingStatus !== "complete" &&
    file.processingStatus !== "error"
  const isComplete = file.processingStatus === "complete"
  const isError = file.processingStatus === "error"
  const score = calculateScore(file.result)

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg transition-all",
        "hover:bg-muted/50",
        isSelected && "bg-muted border-l-2 border-[#FF3300]"
      )}
    >
      <div className="flex items-start gap-2">
        {/* ステータスアイコン */}
        <div className="flex-shrink-0 mt-0.5">
          {isProcessing ? (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          ) : isComplete ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : isError ? (
            <XCircle className="w-4 h-4 text-red-500" />
          ) : (
            <FileText className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {/* ファイル情報 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={file.fileName}>
            {file.fileName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {isComplete && file.result ? (
              <span className={cn("text-xs font-bold", getScoreColor(score))}>
                {score}点
              </span>
            ) : isProcessing ? (
              <span className="text-xs text-blue-500">{file.progress}%</span>
            ) : isError ? (
              <span className="text-xs text-red-500">エラー</span>
            ) : (
              <span className="text-xs text-muted-foreground">待機中</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export function FileSidebar({ onFileClick, selectedFileId }: FileSidebarProps) {
  const files = useFileStore((state) => state.files)

  if (files.length === 0) {
    return (
      <div className="p-4 text-center">
        <FileText className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-xs text-muted-foreground">
          ファイルをアップロードしてください
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1 p-2">
      {files.map((file) => (
        <SidebarItem
          key={file.id}
          file={file}
          isSelected={selectedFileId === file.id}
          onClick={() => onFileClick(file.id)}
        />
      ))}
    </div>
  )
}
