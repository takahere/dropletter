'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, MoreHorizontal, Check, Trash2, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PdfComment } from '@/types/database'

interface PdfPinCommentsProps {
  reportId: string
  currentPage: number
  containerRef: React.RefObject<HTMLDivElement>
  isEditable?: boolean
  currentUserId?: string
  currentUserEmail?: string
}

interface CommentWithUser extends PdfComment {
  user?: {
    email: string
    raw_user_meta_data?: {
      display_name?: string
    }
  }
  replies?: CommentWithUser[]
}

export function PdfPinComments({
  reportId,
  currentPage,
  containerRef,
  isEditable = true,
  currentUserId,
  currentUserEmail,
}: PdfPinCommentsProps) {
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingPin, setIsAddingPin] = useState(false)
  const [activeComment, setActiveComment] = useState<string | null>(null)
  const [newCommentPosition, setNewCommentPosition] = useState<{ x: number; y: number } | null>(null)
  const [newCommentContent, setNewCommentContent] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/pdf-comments?report_id=${reportId}`)
      const data = await res.json()
      if (data.success) {
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Failed to fetch PDF comments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Handle click on PDF to add pin
  const handleContainerClick = useCallback((e: MouseEvent) => {
    if (!isAddingPin || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setNewCommentPosition({ x, y })
    setIsAddingPin(false)
  }, [isAddingPin, containerRef])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('click', handleContainerClick)
    return () => container.removeEventListener('click', handleContainerClick)
  }, [handleContainerClick, containerRef])

  // Create new comment
  const handleCreateComment = async () => {
    if (!newCommentPosition || !newCommentContent.trim()) return

    try {
      const res = await fetch('/api/pdf-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          page_number: currentPage,
          x_position: newCommentPosition.x,
          y_position: newCommentPosition.y,
          content: newCommentContent.trim(),
        }),
      })

      const data = await res.json()
      if (data.success) {
        setComments(prev => [...prev, { ...data.comment, replies: [] }])
        setNewCommentPosition(null)
        setNewCommentContent('')
      }
    } catch (error) {
      console.error('Failed to create comment:', error)
    }
  }

  // Update comment
  const handleUpdateComment = async (commentId: string, content: string) => {
    try {
      const res = await fetch(`/api/pdf-comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      const data = await res.json()
      if (data.success) {
        setComments(prev =>
          prev.map(c => (c.id === commentId ? { ...c, content } : c))
        )
        setEditingCommentId(null)
        setEditContent('')
      }
    } catch (error) {
      console.error('Failed to update comment:', error)
    }
  }

  // Resolve comment
  const handleResolveComment = async (commentId: string, isResolved: boolean) => {
    try {
      const res = await fetch(`/api/pdf-comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_resolved: isResolved }),
      })

      const data = await res.json()
      if (data.success) {
        setComments(prev =>
          prev.map(c => (c.id === commentId ? { ...c, is_resolved: isResolved } : c))
        )
      }
    } catch (error) {
      console.error('Failed to resolve comment:', error)
    }
  }

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('このコメントを削除しますか？')) return

    try {
      const res = await fetch(`/api/pdf-comments/${commentId}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (data.success) {
        setComments(prev => prev.filter(c => c.id !== commentId))
        setActiveComment(null)
      }
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  // Filter comments for current page
  const pageComments = comments.filter(c => c.page_number === currentPage)

  return (
    <>
      {/* Add Pin Button */}
      {isEditable && currentUserId && (
        <button
          onClick={() => setIsAddingPin(!isAddingPin)}
          className={cn(
            'absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all',
            isAddingPin
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 shadow border border-slate-200 dark:border-slate-700'
          )}
        >
          <MessageCircle className="w-4 h-4" />
          {isAddingPin ? 'クリックしてピン留め' : 'コメント追加'}
        </button>
      )}

      {/* Pin markers */}
      {pageComments.map(comment => (
        <div
          key={comment.id}
          className="absolute z-20 group"
          style={{
            left: `${comment.x_position}%`,
            top: `${comment.y_position}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Pin icon */}
          <button
            onClick={() => setActiveComment(activeComment === comment.id ? null : comment.id)}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg',
              comment.is_resolved
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600',
              activeComment === comment.id && 'ring-2 ring-blue-300 ring-offset-2'
            )}
          >
            {comment.is_resolved ? (
              <Check className="w-4 h-4" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
          </button>

          {/* Comment popup */}
          {activeComment === comment.id && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-300">
                      {(comment.user?.raw_user_meta_data?.display_name || comment.user?.email || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {comment.user?.raw_user_meta_data?.display_name || comment.user?.email?.split('@')[0] || 'Unknown'}
                  </span>
                </div>
                <button
                  onClick={() => setActiveComment(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                {editingCommentId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingCommentId(null)}
                        className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleUpdateComment(comment.id, editContent)}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                )}
              </div>

              {/* Footer actions */}
              {currentUserId === comment.user_id && editingCommentId !== comment.id && (
                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCommentId(comment.id)
                        setEditContent(comment.content)
                      }}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"
                      title="編集"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-slate-500 hover:text-red-500"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleResolveComment(comment.id, !comment.is_resolved)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-full transition-colors',
                      comment.is_resolved
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-green-100 dark:hover:bg-green-900/30'
                    )}
                  >
                    {comment.is_resolved ? '解決済み' : '解決にする'}
                  </button>
                </div>
              )}

              {/* Timestamp */}
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-400">
                {new Date(comment.created_at).toLocaleString('ja-JP')}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* New comment input */}
      {newCommentPosition && (
        <div
          className="absolute z-30"
          style={{
            left: `${newCommentPosition.x}%`,
            top: `${newCommentPosition.y}%`,
            transform: 'translate(-50%, 0)',
          }}
        >
          {/* Pin marker */}
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mb-2 mx-auto animate-bounce">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>

          {/* Input form */}
          <div className="w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4">
              <textarea
                value={newCommentContent}
                onChange={e => setNewCommentContent(e.target.value)}
                placeholder="コメントを入力..."
                className="w-full px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600"
                rows={3}
                autoFocus
              />
            </div>
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setNewCommentPosition(null)
                  setNewCommentContent('')
                }}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateComment}
                disabled={!newCommentContent.trim()}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                投稿
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adding pin cursor overlay */}
      {isAddingPin && (
        <div
          className="absolute inset-0 z-10 cursor-crosshair"
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-blue-500 text-white text-sm rounded-full shadow-lg pointer-events-none">
            クリックしてコメントを追加
          </div>
        </div>
      )}
    </>
  )
}
