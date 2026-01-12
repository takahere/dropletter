/**
 * Liveblocks Type Definitions
 * Types for real-time comment synchronization
 */

import type { LiveMap } from "@liveblocks/client"
import type { HighlightComment } from "./comments"

// Convert HighlightComment to LiveComment format (flattened user data)
export type LiveComment = Omit<HighlightComment, "user"> & {
  user_email?: string
}

// Storage schema for Liveblocks room
export type LiveblocksStorage = {
  comments: LiveMap<string, LiveComment>
}

// Room ID format: "report:{reportId}"
export const getRoomId = (reportId: string) => `report:${reportId}`

// Convert HighlightComment to LiveComment
export function toLiveComment(comment: HighlightComment): LiveComment {
  return {
    id: comment.id,
    report_id: comment.report_id,
    user_id: comment.user_id,
    highlight_id: comment.highlight_id,
    content: comment.content,
    is_resolved: comment.is_resolved,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    user_email: comment.user?.email,
  }
}

// Convert LiveComment back to HighlightComment
export function toHighlightComment(liveComment: LiveComment): HighlightComment {
  return {
    id: liveComment.id,
    report_id: liveComment.report_id,
    user_id: liveComment.user_id,
    highlight_id: liveComment.highlight_id,
    content: liveComment.content,
    is_resolved: liveComment.is_resolved,
    created_at: liveComment.created_at,
    updated_at: liveComment.updated_at,
    user: liveComment.user_email ? { email: liveComment.user_email } : undefined,
  }
}
