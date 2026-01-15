/**
 * Database Types for Dropletter
 * Matches Supabase schema from migrations
 */

// ============================================
// USER & ORGANIZATION
// ============================================

export type Plan = 'free' | 'pro'

export interface UserProfile {
  id: string
  created_at: string
  updated_at: string
  display_name: string | null
  avatar_url: string | null
  plan: Plan
  free_checks_used: number
  stripe_customer_id: string | null
}

export interface Organization {
  id: string
  created_at: string
  updated_at: string
  name: string
  slug: string
  owner_id: string
  settings: Record<string, unknown>
}

export type OrganizationRole = 'owner' | 'admin' | 'member'

export interface OrganizationMember {
  id: string
  created_at: string
  organization_id: string
  user_id: string
  role: OrganizationRole
  // Joined data
  user?: {
    email: string
    user_metadata?: {
      display_name?: string
      avatar_url?: string
    }
  }
  organization?: Organization
}

// ============================================
// SUBSCRIPTION
// ============================================

export type SubscriptionStatus = 'active' | 'inactive' | 'canceled' | 'past_due'

export interface Subscription {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

// ============================================
// SHARE LINKS
// ============================================

export interface ShareLink {
  id: string
  created_at: string
  report_id: string
  created_by: string
  token: string
  expires_at: string
  require_auth: boolean
  view_count: number
  // Joined data
  report?: {
    file_name: string
    status: string
  }
  creator?: {
    email: string
  }
}

export interface CreateShareLinkRequest {
  report_id: string
  expires_in_days?: number // default 7
  require_auth?: boolean // default true
}

export interface ShareLinkResponse {
  success: boolean
  share_link?: ShareLink
  share_url?: string
  error?: string
}

// ============================================
// PDF COMMENTS (Pin-style)
// ============================================

export interface PdfComment {
  id: string
  created_at: string
  updated_at: string
  report_id: string
  user_id: string
  page_number: number
  x_position: number // 0-100 percentage
  y_position: number // 0-100 percentage
  content: string
  parent_id: string | null
  is_resolved: boolean
  // Joined data
  user?: {
    email: string
    user_metadata?: {
      display_name?: string
      avatar_url?: string
    }
  }
  replies?: PdfComment[]
}

export interface CreatePdfCommentRequest {
  report_id: string
  page_number: number
  x_position: number
  y_position: number
  content: string
  parent_id?: string
}

export interface UpdatePdfCommentRequest {
  content?: string
  is_resolved?: boolean
}

export interface PdfCommentsResponse {
  success: boolean
  comments?: PdfComment[]
  error?: string
}

// ============================================
// ACTIVITY LOGS
// ============================================

export type ActivityActionType =
  | 'report.created'
  | 'report.viewed'
  | 'report.shared'
  | 'report.deleted'
  | 'comment.added'
  | 'comment.resolved'
  | 'comment.deleted'
  | 'human_review.requested'
  | 'human_review.assigned'
  | 'human_review.completed'
  | 'human_review.canceled'
  | 'subscription.started'
  | 'subscription.canceled'
  | 'organization.created'
  | 'organization.member_added'
  | 'organization.member_removed'

export type ActivityTargetType =
  | 'report'
  | 'comment'
  | 'share_link'
  | 'human_review'
  | 'subscription'
  | 'organization'

export interface ActivityLog {
  id: string
  created_at: string
  user_id: string | null
  organization_id: string | null
  action_type: ActivityActionType
  target_type: ActivityTargetType | null
  target_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  // Joined data
  user?: {
    email: string
  }
  target_report?: {
    file_name: string
  }
}

export interface ActivityLogsResponse {
  success: boolean
  logs?: ActivityLog[]
  total?: number
  error?: string
}

export interface ActivityLogsQuery {
  user_id?: string
  organization_id?: string
  action_type?: ActivityActionType
  target_type?: ActivityTargetType
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

// ============================================
// EXPERTS
// ============================================

export interface Expert {
  id: string
  created_at: string
  updated_at: string
  user_id: string | null
  name: string
  email: string
  title: string | null
  specialties: string[]
  bio: string | null
  is_verified: boolean
  verification_documents: unknown[]
  is_available: boolean
  max_concurrent_reviews: number
  total_reviews: number
  average_rating: number | null
  stripe_account_id: string | null
}

// ============================================
// HUMAN REVIEW
// ============================================

export type HumanReviewStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'canceled'

export type HumanReviewPriority = 'normal' | 'urgent'

export type PaymentStatus = 'pending' | 'paid' | 'refunded'

export interface HumanReviewRequest {
  id: string
  created_at: string
  updated_at: string
  report_id: string
  requester_id: string
  expert_id: string | null
  status: HumanReviewStatus
  notes: string | null
  priority: HumanReviewPriority
  due_at: string
  expert_comments: string | null
  expert_rating: number | null
  completed_at: string | null
  amount_cents: number
  payment_status: PaymentStatus
  stripe_payment_intent_id: string | null
  // Joined data
  report?: {
    file_name: string
    status: string
  }
  requester?: {
    email: string
  }
  expert?: Expert
}

export interface CreateHumanReviewRequest {
  report_id: string
  notes?: string
  priority?: HumanReviewPriority
}

export interface HumanReviewResponse {
  success: boolean
  review?: HumanReviewRequest
  checkout_url?: string // Stripe checkout URL
  error?: string
}

// ============================================
// API RESPONSE HELPERS
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data?: T[]
  total: number
  limit: number
  offset: number
  has_more: boolean
  error?: string
}
