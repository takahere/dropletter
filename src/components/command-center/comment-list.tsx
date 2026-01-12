"use client"

import { useState, useCallback } from "react"
import { Pencil, Trash2, Check, X, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { CommentInput } from "./comment-input"
import type { HighlightComment } from "@/types/comments"

interface CommentListProps {
  comments: HighlightComment[]
  currentUserId?: string
  onUpdate: (commentId: string, content: string) => Promise<boolean>
  onDelete: (commentId: string) => Promise<boolean>
  onResolve: (commentId: string, isResolved: boolean) => Promise<boolean>
  className?: string
}

export function CommentList({
  comments,
  currentUserId,
  onUpdate,
  onDelete,
  onResolve,
  className,
}: CommentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleUpdate = useCallback(async (commentId: string, content: string) => {
    const success = await onUpdate(commentId, content)
    if (success) {
      setEditingId(null)
    }
    return success
  }, [onUpdate])

  const handleDelete = useCallback(async (commentId: string) => {
    if (!confirm("このコメントを削除しますか？")) return
    await onDelete(commentId)
  }, [onDelete])

  if (comments.length === 0) {
    return (
      <div className={cn("text-center py-4", className)}>
        <MessageCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">コメントはまだありません</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {comments.map((comment) => {
        const isOwner = currentUserId === comment.user_id
        const isEditing = editingId === comment.id

        return (
          <div
            key={comment.id}
            className={cn(
              "p-3 rounded-lg border",
              comment.is_resolved
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
            )}
          >
            {isEditing ? (
              <CommentInput
                initialValue={comment.content}
                isEditing
                onSubmit={(content) => handleUpdate(comment.id, content)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                {/* Comment Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {/* User avatar */}
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                      {comment.user?.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {comment.user?.email?.split("@")[0] || "ユーザー"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(comment.created_at).toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Actions */}
                  {isOwner && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onResolve(comment.id, !comment.is_resolved)}
                        className={cn(
                          "p-1 rounded transition-colors",
                          comment.is_resolved
                            ? "text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                            : "text-slate-400 hover:text-green-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        )}
                        title={comment.is_resolved ? "解決を取り消す" : "解決済みにする"}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(comment.id)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                        title="編集"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Comment Content */}
                <p className={cn(
                  "text-sm",
                  comment.is_resolved ? "text-green-700 dark:text-green-300" : "text-slate-700 dark:text-slate-300"
                )}>
                  {comment.content}
                </p>

                {/* Resolved badge */}
                {comment.is_resolved && (
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <Check className="w-3 h-3" />
                    解決済み
                  </span>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
