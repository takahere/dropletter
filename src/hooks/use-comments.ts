"use client"

import { useState, useCallback, useEffect } from "react"
import type { HighlightComment, CreateCommentRequest, UpdateCommentRequest } from "@/types/comments"

interface UseCommentsOptions {
  reportId: string
  autoFetch?: boolean
}

export function useComments({ reportId, autoFetch = true }: UseCommentsOptions) {
  const [comments, setComments] = useState<HighlightComment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all comments for the report
  const fetchComments = useCallback(async () => {
    if (!reportId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/reports/${reportId}/comments`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "コメントの取得に失敗しました")
      }

      setComments(data.comments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }, [reportId])

  // Add a new comment
  const addComment = useCallback(async (request: CreateCommentRequest) => {
    if (!reportId) return null

    try {
      const response = await fetch(`/api/reports/${reportId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "コメントの作成に失敗しました")
      }

      // Add the new comment to the local state
      setComments((prev) => [...prev, data.comment])
      return data.comment as HighlightComment
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
      return null
    }
  }, [reportId])

  // Update an existing comment
  const updateComment = useCallback(async (commentId: string, request: UpdateCommentRequest) => {
    if (!reportId) return null

    try {
      const response = await fetch(`/api/reports/${reportId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "コメントの更新に失敗しました")
      }

      // Update the comment in local state
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? data.comment : c))
      )
      return data.comment as HighlightComment
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
      return null
    }
  }, [reportId])

  // Delete a comment
  const deleteComment = useCallback(async (commentId: string) => {
    if (!reportId) return false

    try {
      const response = await fetch(`/api/reports/${reportId}/comments/${commentId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "コメントの削除に失敗しました")
      }

      // Remove the comment from local state
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
      return false
    }
  }, [reportId])

  // Get comments for a specific highlight
  const getCommentsForHighlight = useCallback((highlightId: string) => {
    return comments.filter((c) => c.highlight_id === highlightId)
  }, [comments])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && reportId) {
      fetchComments()
    }
  }, [autoFetch, reportId, fetchComments])

  return {
    comments,
    isLoading,
    error,
    fetchComments,
    addComment,
    updateComment,
    deleteComment,
    getCommentsForHighlight,
  }
}
