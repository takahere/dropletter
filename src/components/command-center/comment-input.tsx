"use client"

import { useState, useCallback } from "react"
import { Send, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CommentInputProps {
  onSubmit: (content: string) => Promise<boolean>
  onCancel?: () => void
  initialValue?: string
  placeholder?: string
  isEditing?: boolean
  className?: string
}

export function CommentInput({
  onSubmit,
  onCancel,
  initialValue = "",
  placeholder = "コメントを入力...",
  isEditing = false,
  className,
}: CommentInputProps) {
  const [content, setContent] = useState(initialValue)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const success = await onSubmit(content.trim())
      if (success) {
        setContent("")
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [content, isSubmitting, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
    // Cancel on Escape
    if (e.key === "Escape" && onCancel) {
      onCancel()
    }
  }, [handleSubmit, onCancel])

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSubmitting}
        rows={2}
        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 pr-20"
      />
      <div className="absolute bottom-2 right-2 flex items-center gap-1">
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title="キャンセル"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="p-1.5 text-blue-600 hover:text-blue-700 disabled:text-slate-300 dark:disabled:text-slate-600 transition-colors"
          title={isEditing ? "更新 (Cmd+Enter)" : "送信 (Cmd+Enter)"}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        Cmd+Enter で{isEditing ? "更新" : "送信"}
      </p>
    </form>
  )
}
