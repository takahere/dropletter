"use client"

import { createClient, LiveMap } from "@liveblocks/client"
import { createRoomContext } from "@liveblocks/react"

// Check if Liveblocks is configured
const LIVEBLOCKS_PUBLIC_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY
export const isLiveblocksEnabled = !!LIVEBLOCKS_PUBLIC_KEY

// Liveblocks client initialization (only if key is provided)
const client = LIVEBLOCKS_PUBLIC_KEY
  ? createClient({
      publicApiKey: LIVEBLOCKS_PUBLIC_KEY,
    })
  : null

// Type definitions for Liveblocks storage
export type LiveComment = {
  id: string
  report_id: string
  user_id: string
  highlight_id: string
  content: string
  is_resolved: boolean
  created_at: string
  updated_at: string
  user_email?: string
}

// Storage type - LiveMap keyed by comment ID
type Storage = {
  comments: LiveMap<string, LiveComment>
}

// User metadata (minimal - no presence needed)
type UserMeta = {
  id: string
  info: {
    email: string
  }
}

// Presence type (minimal for now)
type Presence = Record<string, never>

// Room event types for comment operations
type RoomEvent =
  | { type: "COMMENT_ADDED"; commentId: string }
  | { type: "COMMENT_UPDATED"; commentId: string }
  | { type: "COMMENT_DELETED"; commentId: string }

// Create room context with types (only if client is available)
const roomContext = client
  ? createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client)
  : null

// Export hooks (will be null if Liveblocks is not configured)
export const RoomProvider = roomContext?.RoomProvider
export const useRoom = roomContext?.useRoom
export const useStorage = roomContext?.useStorage
export const useMutation = roomContext?.useMutation
export const useBroadcastEvent = roomContext?.useBroadcastEvent
export const useEventListener = roomContext?.useEventListener
export const useSelf = roomContext?.useSelf
export const useStatus = roomContext?.useStatus

// Re-export LiveMap for use in components
export { LiveMap }
