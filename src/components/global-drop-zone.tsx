"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileText } from "lucide-react"

interface GlobalDropZoneProps {
  onFilesDropped: (files: File[]) => void
  disabled?: boolean
}

/**
 * フルスクリーンドロップゾーン
 * ファイルをブラウザウィンドウ全体にドラッグすると、
 * 全画面オーバーレイが表示されドロップ可能になる
 */
export function GlobalDropZone({ onFilesDropped, disabled }: GlobalDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    // ファイルがドラッグされているか確認
    if (e.dataTransfer?.types.includes("Files")) {
      setDragCounter((prev) => prev + 1)
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setDragCounter((prev) => {
      const newCount = prev - 1
      if (newCount <= 0) {
        setIsDragOver(false)
        return 0
      }
      return newCount
    })
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragOver(false)
    setDragCounter(0)

    if (disabled) return

    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length > 0) {
      onFilesDropped(files)
    }
  }, [disabled, onFilesDropped])

  useEffect(() => {
    document.addEventListener("dragenter", handleDragEnter)
    document.addEventListener("dragleave", handleDragLeave)
    document.addEventListener("dragover", handleDragOver)
    document.addEventListener("drop", handleDrop)

    return () => {
      document.removeEventListener("dragenter", handleDragEnter)
      document.removeEventListener("dragleave", handleDragLeave)
      document.removeEventListener("dragover", handleDragOver)
      document.removeEventListener("drop", handleDrop)
    }
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  return (
    <AnimatePresence>
      {isDragOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-blue-500/10 backdrop-blur-sm flex items-center justify-center"
        >
          {/* 背景のグラデーション */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/20" />

          {/* ドロップエリア */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative bg-white dark:bg-slate-800 rounded-3xl p-12 shadow-2xl border-4 border-dashed border-blue-500"
          >
            {/* 吸い込みアニメーションパーティクル */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 0,
                    scale: 0,
                    x: (Math.random() - 0.5) * 300,
                    y: (Math.random() - 0.5) * 300,
                  }}
                  animate={{
                    opacity: [0, 0.5, 0],
                    scale: [0, 1, 0],
                    x: 0,
                    y: 0,
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeIn",
                  }}
                  className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full bg-blue-500"
                />
              ))}
            </div>

            {/* アイコンとテキスト */}
            <div className="relative z-10 text-center">
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, -5, 5, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="inline-block mb-6"
              >
                <div className="w-24 h-24 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <Upload className="w-12 h-12 text-blue-500" />
                </div>
              </motion.div>

              <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">
                ここにドロップ
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg">
                ファイルをドロップしてアップロード
              </p>

              {/* サポートファイル形式 */}
              <div className="flex items-center justify-center gap-3 mt-6">
                {["PDF", "Word", "Text"].map((format) => (
                  <div
                    key={format}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full"
                  >
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {format}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
