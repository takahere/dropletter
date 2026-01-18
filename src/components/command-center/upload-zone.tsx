"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Upload, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFileStore } from "@/lib/stores/file-store"

interface UploadZoneProps {
  compact?: boolean
}

// リトライ設定
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// 遅延関数
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// リトライ付きfetch
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)
      // 400エラーはリトライしない（クライアント側の問題）
      if (response.status >= 400 && response.status < 500) {
        return response
      }
      // 成功またはサーバーエラー以外
      if (response.ok) {
        return response
      }
      // サーバーエラーの場合はリトライ
      console.warn(`[UploadZone] Attempt ${attempt} failed with status ${response.status}`)
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      console.warn(`[UploadZone] Attempt ${attempt} failed:`, error)
      lastError = error instanceof Error ? error : new Error(String(error))
    }

    // 最後の試行でなければ待機してリトライ
    if (attempt < retries) {
      await delay(RETRY_DELAY_MS * attempt) // 指数バックオフ
    }
  }

  throw lastError || new Error("リクエストに失敗しました")
}

export function UploadZone({ compact = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addFile = useFileStore((state) => state.addFile)
  const updateFile = useFileStore((state) => state.updateFile)

  // クライアントサイドでマウントされたことを確認
  useEffect(() => {
    setMounted(true)
  }, [])

  // ファイルをアップロードして処理を開始
  const processFile = useCallback(
    async (file: File) => {
      console.log("[UploadZone] Processing file:", file.name)

      // Zustandにファイルを追加
      const fileId = addFile({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadStatus: "uploading",
        processingStatus: "idle",
        progress: 0,
      })

      try {
        // 1. ファイルをアップロード（リトライ付き）
        const formData = new FormData()
        formData.append("file", file)

        console.log("[UploadZone] Uploading file...")
        const uploadResponse = await fetchWithRetry("/api/upload", {
          method: "POST",
          body: formData,
        })

        const uploadResult = await uploadResponse.json()
        console.log("[UploadZone] Upload result:", uploadResult)

        if (!uploadResponse.ok || !uploadResult.success) {
          throw new Error(uploadResult.error || "アップロードに失敗しました")
        }

        // 2. アップロード成功 → 処理開始
        updateFile(fileId, {
          filePath: uploadResult.filePath,
          uploadStatus: "uploaded",
          processingStatus: "pending",
        })

        // 3. 処理APIを呼び出し（リトライ付き）
        console.log("[UploadZone] Starting processing...")
        const processResponse = await fetchWithRetry("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId,
            filePath: uploadResult.filePath,
            fileName: file.name,
          }),
        })

        const processResult = await processResponse.json()
        console.log("[UploadZone] Process result:", processResult)

        if (!processResponse.ok || !processResult.success) {
          throw new Error(processResult.error || "処理の開始に失敗しました")
        }

        // 処理開始成功
        updateFile(fileId, {
          reportId: processResult.reportId,
          processingStatus: "parsing",
          progress: 10,
        })
      } catch (error) {
        console.error("[UploadZone] Error:", error)
        updateFile(fileId, {
          uploadStatus: "error",
          processingStatus: "error",
          error: error instanceof Error ? error.message : "エラーが発生しました",
        })
      }
    },
    [addFile, updateFile]
  )

  // 複数ファイルを並列処理
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      console.log("[UploadZone] handleFiles called with", files.length, "files")
      setIsUploading(true)
      const fileArray = Array.from(files)

      // バリデーション - PDF、PNG、JPEG、WebPをサポート
      const validFiles = fileArray.filter((file) => {
        const isValid = file.type === "application/pdf" ||
                       file.name.endsWith(".pdf") ||
                       file.type.includes("pdf") ||
                       file.type === "image/png" ||
                       file.type === "image/jpeg" ||
                       file.type === "image/webp" ||
                       file.type === "image/gif" ||
                       file.name.endsWith(".png") ||
                       file.name.endsWith(".jpg") ||
                       file.name.endsWith(".jpeg") ||
                       file.name.endsWith(".webp") ||
                       file.name.endsWith(".gif")
        console.log("[UploadZone] File:", file.name, "Type:", file.type, "Valid:", isValid)
        return isValid
      })

      if (validFiles.length === 0) {
        console.log("[UploadZone] No valid files")
        alert("PDF、PNG、JPEG、WebPファイルを選択してください")
        setIsUploading(false)
        return
      }

      // 並列でアップロード開始
      await Promise.all(validFiles.map((file) => processFile(file)))

      setIsUploading(false)
    },
    [processFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      console.log("[UploadZone] Drop event, files:", e.dataTransfer.files.length)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleClick = useCallback(() => {
    console.log("[UploadZone] Click event")
    fileInputRef.current?.click()
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[UploadZone] Input change event")
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = ""
    }
  }, [handleFiles])

  // SSR中は何も表示しない
  if (!mounted) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-muted-foreground/25 p-12 text-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  if (compact) {
    return (
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
          onChange={handleInputChange}
          style={{ display: "none" }}
        />
        <button
          type="button"
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={isUploading}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all",
            isDragging
              ? "border-[#FF3300] bg-[#FF3300]/5"
              : "border-muted-foreground/25 hover:border-[#FF3300]/50 hover:bg-muted/50"
          )}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 text-[#FF3300] animate-spin" />
          ) : (
            <Plus className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {isDragging ? "ここにドロップ" : "ファイルを追加"}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
        onChange={handleInputChange}
        style={{ display: "none" }}
      />
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ cursor: "pointer" }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all",
          isDragging
            ? "border-[#FF3300] bg-[#FF3300]/5"
            : "border-muted-foreground/25 hover:border-[#FF3300]/50 hover:bg-muted/50"
        )}
      >
        <div>
          <Upload
            className={cn(
              "w-12 h-12 mx-auto mb-4 transition-colors",
              isDragging ? "text-[#FF3300]" : "text-muted-foreground"
            )}
          />
          <h3 className="text-lg font-semibold mb-1">
            {isDragging ? "ここにドロップ!" : "ファイルをドロップ"}
          </h3>
          <p className="text-sm text-muted-foreground">
            クリックまたはドラッグ＆ドロップでファイルを選択（PDF/PNG/JPEG/WebP）
          </p>
        </div>
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#FF3300] animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
