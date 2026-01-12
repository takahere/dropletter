"use client"

import { useCallback, useMemo, useState, useEffect } from "react"
import {
  useStorage,
  useMutation,
  useBroadcastEvent,
  useEventListener,
  isLiveblocksEnabled,
} from "@/lib/liveblocks/liveblocks.config"
import { toHighlightComment, type LiveComment } from "@/types/liveblocks"
import type {
  HighlightComment,
  CreateCommentRequest,
  UpdateCommentRequest,
} from "@/types/comments"

interface UseLiveCommentsOptions {
  reportId: string
  userId?: string
  userEmail?: string
}

// Fallback hook when Liveblocks is not enabled
function useFallbackComments({ reportId }: UseLiveCommentsOptions) {
  const [comments, setComments] = useState<HighlightComment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch comments from API
  useEffect(() => {
    if (!reportId) return

    fetch(`/api/reports/${reportId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setComments(data.comments || [])
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [reportId])

  const addComment = useCallback(
    async (request: CreateCommentRequest) => {
      const response = await fetch(`/api/reports/${reportId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })
      const data = await response.json()
      if (data.success) {
        setComments((prev) => [...prev, data.comment])
        return data.comment
      }
      return null
    },
    [reportId]
  )

  const updateComment = useCallback(
    async (commentId: string, request: UpdateCommentRequest) => {
      const response = await fetch(
        `/api/reports/${reportId}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        }
      )
      const data = await response.json()
      if (data.success) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? data.comment : c))
        )
        return data.comment
      }
      return null
    },
    [reportId]
  )

  const deleteComment = useCallback(
    async (commentId: string) => {
      const response = await fetch(
        `/api/reports/${reportId}/comments/${commentId}`,
        { method: "DELETE" }
      )
      const data = await response.json()
      if (data.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
        return true
      }
      return false
    },
    [reportId]
  )

  const getCommentsForHighlight = useCallback(
    (highlightId: string) => comments.filter((c) => c.highlight_id === highlightId),
    [comments]
  )

  return {
    comments,
    isLoading,
    error: null,
    addComment,
    updateComment,
    deleteComment,
    getCommentsForHighlight,
  }
}

export function useLiveComments(options: UseLiveCommentsOptions) {
  // If Liveblocks is not enabled, use fallback
  if (!isLiveblocksEnabled) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useFallbackComments(options)
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useLiveblocksComments(options)
}

function useLiveblocksComments({
  reportId,
  userId,
  userEmail,
}: UseLiveCommentsOptions) {
  const broadcast = useBroadcastEvent?.()

  // Read comments from Liveblocks storage
  const liveComments = useStorage?.((root) => root.comments)

  // Convert LiveMap to array of HighlightComment
  const comments = useMemo((): HighlightComment[] => {
    if (!liveComments) return []

    const commentsArray: HighlightComment[] = []
    liveComments.forEach((comment: LiveComment) => {
      commentsArray.push(toHighlightComment(comment))
    })

    // Sort by created_at ascending
    return commentsArray.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [liveComments])

  // Add comment mutation (Liveblocks storage update)
  const addCommentMutation = useMutation?.(
    ({ storage }, newComment: LiveComment) => {
      storage.get("comments").set(newComment.id, newComment)
    },
    []
  )

  // Wrapper that persists to Supabase and updates Liveblocks
  const addComment = useCallback(
    async (request: CreateCommentRequest) => {
      if (!userId) return null

      // First, persist to Supabase to get the real ID
      try {
        const response = await fetch(`/api/reports/${reportId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        })
        const data = await response.json()

        if (!data.success) {
          console.error("Failed to persist comment:", data.error)
          return null
        }

        const savedComment = data.comment as HighlightComment

        // Update Liveblocks storage with the persisted comment
        const liveComment: LiveComment = {
          id: savedComment.id,
          report_id: savedComment.report_id,
          user_id: savedComment.user_id,
          highlight_id: savedComment.highlight_id,
          content: savedComment.content,
          is_resolved: savedComment.is_resolved,
          created_at: savedComment.created_at,
          updated_at: savedComment.updated_at,
          user_email: savedComment.user?.email || userEmail,
        }

        addCommentMutation?.(liveComment)

        // Broadcast event to other clients
        broadcast?.({ type: "COMMENT_ADDED", commentId: savedComment.id })

        return savedComment
      } catch (error) {
        console.error("Failed to add comment:", error)
        return null
      }
    },
    [reportId, userId, userEmail, addCommentMutation, broadcast]
  )

  // Update comment mutation
  const updateCommentMutation = useMutation?.(
    ({ storage }, commentId: string, updates: Partial<LiveComment>) => {
      const comments = storage.get("comments")
      const existing = comments.get(commentId)

      if (existing) {
        const updated: LiveComment = {
          ...existing,
          ...updates,
          updated_at: new Date().toISOString(),
        }
        comments.set(commentId, updated)
        return updated
      }
      return null
    },
    []
  )

  const updateComment = useCallback(
    async (commentId: string, request: UpdateCommentRequest) => {
      // Optimistic update in Liveblocks
      updateCommentMutation?.(commentId, request)

      // Persist to Supabase
      try {
        const response = await fetch(
          `/api/reports/${reportId}/comments/${commentId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
          }
        )
        const data = await response.json()

        if (!data.success) {
          console.error("Failed to update comment:", data.error)
          return null
        }

        broadcast?.({ type: "COMMENT_UPDATED", commentId })
        return data.comment as HighlightComment
      } catch (error) {
        console.error("Failed to update comment:", error)
        return null
      }
    },
    [reportId, updateCommentMutation, broadcast]
  )

  // Delete comment mutation
  const deleteCommentMutation = useMutation?.(({ storage }, commentId: string) => {
    storage.get("comments").delete(commentId)
  }, [])

  const deleteComment = useCallback(
    async (commentId: string) => {
      // Optimistic delete
      deleteCommentMutation?.(commentId)

      // Persist to Supabase
      try {
        const response = await fetch(
          `/api/reports/${reportId}/comments/${commentId}`,
          {
            method: "DELETE",
          }
        )
        const data = await response.json()

        if (!data.success) {
          console.error("Failed to delete comment:", data.error)
          return false
        }

        broadcast?.({ type: "COMMENT_DELETED", commentId })
        return true
      } catch (error) {
        console.error("Failed to delete comment:", error)
        return false
      }
    },
    [reportId, deleteCommentMutation, broadcast]
  )

  // Get comments for a specific highlight
  const getCommentsForHighlight = useCallback(
    (highlightId: string) => {
      return comments.filter((c) => c.highlight_id === highlightId)
    },
    [comments]
  )

  // Listen for events from other clients (for UI feedback if needed)
  useEventListener?.(({ event }) => {
    // Can be used for toast notifications, etc.
    console.log("[Liveblocks] Event received:", event)
  })

  return {
    comments,
    isLoading: liveComments === null,
    error: null, // Could add error state if needed
    addComment,
    updateComment,
    deleteComment,
    getCommentsForHighlight,
    // No fetchComments needed - real-time sync handles it
  }
}
