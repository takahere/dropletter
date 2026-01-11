"use client"

import { FileCard } from "./file-card"
import { useFileStore } from "@/lib/stores/file-store"
import { FolderOpen } from "lucide-react"

export function FileGrid() {
  const files = useFileStore((state) => state.files)
  const selectFile = useFileStore((state) => state.selectFile)
  const retryFile = useFileStore((state) => state.retryFile)

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FolderOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">ファイルがありません</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          上のドロップゾーンにPDFファイルをドラッグ＆ドロップするか、
          クリックしてファイルを選択してください
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          onClick={() => selectFile(file.id)}
          onRetry={() => retryFile(file.id)}
        />
      ))}
    </div>
  )
}
