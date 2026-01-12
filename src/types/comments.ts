/**
 * Highlight Comment Types
 * User comments on specific highlights in PDF documents
 */

export interface HighlightComment {
  id: string
  report_id: string
  user_id: string
  highlight_id: string
  content: string
  is_resolved: boolean
  created_at: string
  updated_at: string
  // Joined user data
  user?: {
    email: string
  }
}

export interface CreateCommentRequest {
  highlight_id: string
  content: string
}

export interface UpdateCommentRequest {
  content?: string
  is_resolved?: boolean
}

export interface CommentsResponse {
  success: boolean
  comments?: HighlightComment[]
  error?: string
}

export interface CommentResponse {
  success: boolean
  comment?: HighlightComment
  error?: string
}
