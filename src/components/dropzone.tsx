"use client"

import { useState, useCallback, useRef } from "react"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import { Upload, FileText, X, Sparkles, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  status: "uploading" | "processing" | "complete" | "error"
  filePath?: string
  error?: string
}

interface DropzoneProps {
  onFileUploaded?: (file: UploadedFile) => void
  onFilesAdded?: (files: File[]) => void
  isProcessing?: boolean
  disabled?: boolean
}

/**
 * ファイルアップロード用ドロップゾーン
 * ドロップされたファイルを /api/upload にPOSTし、filePathを取得
 */
export function Dropzone({
  onFileUploaded,
  onFilesAdded,
  isProcessing,
  disabled,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const controls = useAnimation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ファイルをアップロード
  const uploadFile = async (file: File): Promise<UploadedFile> => {
    const id = crypto.randomUUID()
    const uploadedFile: UploadedFile = {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading",
    }

    // UIにファイルを追加
    setFiles((prev) => [...prev, uploadedFile])

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "アップロードに失敗しました")
      }

      // アップロード成功 - ステータスを更新
      const updatedFile: UploadedFile = {
        ...uploadedFile,
        status: "processing",
        filePath: result.filePath,
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === id ? updatedFile : f))
      )

      // 親コンポーネントに通知
      onFileUploaded?.(updatedFile)

      return updatedFile
    } catch (error) {
      // エラー処理
      const errorFile: UploadedFile = {
        ...uploadedFile,
        status: "error",
        error: error instanceof Error ? error.message : "不明なエラー",
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === id ? errorFile : f))
      )

      return errorFile
    }
  }

  // ファイルのステータスを外部から更新するための関数
  const updateFileStatus = useCallback(
    (id: string, status: UploadedFile["status"]) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status } : f))
      )
    },
    []
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled) return

      if (!isDragging) {
        setIsDragging(true)
        controls.start({
          scale: 1.02,
          boxShadow: "0 0 60px rgba(255, 51, 0, 0.4)",
        })
      }
    },
    [isDragging, controls, disabled]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      controls.start({
        scale: 1,
        boxShadow: "0 0 0px rgba(255, 51, 0, 0)",
      })
    },
    [controls]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      // 吸い込みアニメーション
      await controls.start({
        scale: 0.95,
        transition: { duration: 0.1 },
      })
      await controls.start({
        scale: 1,
        boxShadow: "0 0 0px rgba(255, 51, 0, 0)",
        transition: { type: "spring", stiffness: 300, damping: 20 },
      })

      const droppedFiles = Array.from(e.dataTransfer.files)
      onFilesAdded?.(droppedFiles)

      // 各ファイルをアップロード
      for (const file of droppedFiles) {
        await uploadFile(file)
      }
    },
    [controls, onFilesAdded, disabled]
  )

  const handleClick = () => {
    if (disabled) return
    fileInputRef.current?.click()
  }

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    onFilesAdded?.(selectedFiles)

    // 各ファイルをアップロード
    for (const file of selectedFiles) {
      await uploadFile(file)
    }

    // inputをリセット（同じファイルを再度選択できるように）
    e.target.value = ""
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 外部からステータス更新できるようにエクスポート
  ;(Dropzone as any).updateFileStatus = updateFileStatus
  ;(Dropzone as any).files = files

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      <motion.div
        animate={controls}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed p-16 text-center transition-colors",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer",
          isDragging
            ? "border-[#FF3300] bg-[#FF3300]/5"
            : "border-muted-foreground/25 hover:border-[#FF3300]/50 hover:bg-muted/50"
        )}
        initial={{ scale: 1, boxShadow: "0 0 0px rgba(255, 51, 0, 0)" }}
        whileHover={disabled ? {} : { scale: 1.01 }}
        whileTap={disabled ? {} : { scale: 0.99 }}
      >
        {/* ドラッグ中の背景グロー */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-[#FF3300]/10 via-transparent to-[#FF3300]/10"
            />
          )}
        </AnimatePresence>

        {/* 吸い込みアニメーションパーティクル */}
        <AnimatePresence>
          {isDragging && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 0,
                    scale: 0,
                    x: (Math.random() - 0.5) * 200,
                    y: (Math.random() - 0.5) * 200,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: 0,
                    y: 0,
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeIn",
                  }}
                  className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full bg-[#FF3300]"
                />
              ))}
            </>
          )}
        </AnimatePresence>

        <motion.div
          animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="relative z-10"
        >
          <motion.div
            animate={isDragging ? { rotate: [0, -10, 10, 0] } : {}}
            transition={{ duration: 0.5, repeat: isDragging ? Infinity : 0 }}
          >
            <Upload
              className={cn(
                "w-16 h-16 mx-auto mb-6 transition-colors",
                isDragging ? "text-[#FF3300]" : "text-muted-foreground"
              )}
            />
          </motion.div>

          <h3 className="text-2xl font-bold mb-2">
            {isDragging ? "ここにドロップ!" : "ファイルをドロップ"}
          </h3>
          <p className="text-muted-foreground">
            PDF, Word, テキストファイルに対応
          </p>
          <p className="text-sm text-muted-foreground/60 mt-2">
            または、クリックして選択
          </p>
        </motion.div>
      </motion.div>

      {/* ファイルリスト */}
      <AnimatePresence mode="popLayout">
        {files.map((file) => (
          <motion.div
            key={file.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "flex items-center gap-4 p-4 bg-card border rounded-xl shadow-sm",
              file.status === "error" && "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
            )}
          >
            <div className="flex-shrink-0">
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  file.status === "error"
                    ? "bg-red-100 dark:bg-red-900/30"
                    : "bg-[#FF3300]/10"
                )}
              >
                <FileText
                  className={cn(
                    "w-6 h-6",
                    file.status === "error" ? "text-red-500" : "text-[#FF3300]"
                  )}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)}
                {file.error && (
                  <span className="text-red-500 ml-2">{file.error}</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {file.status === "uploading" && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-[#FF3300] border-t-transparent rounded-full"
                />
              )}
              {file.status === "processing" && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center gap-1 text-[#FF3300]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-medium">AI処理中</span>
                </motion.div>
              )}
              {file.status === "complete" && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">完了</span>
                </div>
              )}
              {file.status === "error" && (
                <div className="flex items-center gap-1 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">エラー</span>
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(file.id)
                }}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
