"use client"

import { ReactNode, useCallback } from "react"
import { RoomProvider, LiveMap, isLiveblocksEnabled } from "@/lib/liveblocks/liveblocks.config"
import { getRoomId, toLiveComment, type LiveComment } from "@/types/liveblocks"
import type { HighlightComment } from "@/types/comments"

interface CommentsRoomProviderProps {
  reportId: string
  initialComments?: HighlightComment[]
  children: ReactNode
}

export function CommentsRoomProvider({
  reportId,
  initialComments = [],
  children,
}: CommentsRoomProviderProps) {
  // If Liveblocks is not configured, just render children without the provider
  if (!isLiveblocksEnabled || !RoomProvider) {
    return <>{children}</>
  }

  const roomId = getRoomId(reportId)

  // Convert initial comments to LiveMap format
  const initialStorage = useCallback(() => {
    const commentsMap = new LiveMap<string, LiveComment>()

    initialComments.forEach((comment) => {
      commentsMap.set(comment.id, toLiveComment(comment))
    })

    return { comments: commentsMap }
  }, [initialComments])

  return (
    <RoomProvider
      id={roomId}
      initialStorage={initialStorage}
    >
      {children}
    </RoomProvider>
  )
}
