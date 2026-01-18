"use client"

import { useCallback, useState } from "react"
import { useFileStore } from "@/lib/stores/file-store"

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
      console.warn(`[useFileUpload] Attempt ${attempt} failed with status ${response.status}`)
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      console.warn(`[useFileUpload] Attempt ${attempt} failed:`, error)
      lastError = error instanceof Error ? error : new Error(String(error))
    }

    // 最後の試行でなければ待機してリトライ
    if (attempt < retries) {
      await delay(RETRY_DELAY_MS * attempt) // 指数バックオフ
    }
  }

  throw lastError || new Error("リクエストに失敗しました")
}

/**
 * ファイルアップロードと処理を行うカスタムフック
 * UploadZone と GlobalDropZone で共有
 */
export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const addFile = useFileStore((state) => state.addFile)
  const updateFile = useFileStore((state) => state.updateFile)

  // ファイルをアップロードして処理を開始
  const processFile = useCallback(
    async (file: File) => {
      console.log("[useFileUpload] Processing file:", file.name)

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

        console.log("[useFileUpload] Uploading file...")
        const uploadResponse = await fetchWithRetry("/api/upload", {
          method: "POST",
          body: formData,
        })

        const uploadResult = await uploadResponse.json()
        console.log("[useFileUpload] Upload result:", uploadResult)

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
        console.log("[useFileUpload] Starting processing...")
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
        console.log("[useFileUpload] Process result:", processResult)

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
        console.error("[useFileUpload] Error:", error)
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
      console.log("[useFileUpload] handleFiles called with", files.length, "files")
      setIsUploading(true)
      const fileArray = Array.from(files)

      // バリデーション - PDF、PNG、JPEG、WebP、GIFをサポート
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
        console.log("[useFileUpload] File:", file.name, "Type:", file.type, "Valid:", isValid)
        return isValid
      })

      if (validFiles.length === 0) {
        console.log("[useFileUpload] No valid files")
        alert("PDF、PNG、JPEG、WebP、GIFファイルを選択してください")
        setIsUploading(false)
        return
      }

      // 並列でアップロード開始
      await Promise.all(validFiles.map((file) => processFile(file)))

      setIsUploading(false)
    },
    [processFile]
  )

  return {
    isUploading,
    handleFiles,
    processFile,
  }
}
