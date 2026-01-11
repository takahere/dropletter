"use client"

import { useEffect, useCallback, useRef } from "react"
import { useFileStore } from "@/lib/stores/file-store"

interface StatusResponse {
  success: boolean
  statuses: Array<{
    fileId: string
    status: string
    processingStatus: string | null
    progress: number
    reportId: string | null
    result: {
      riskLevel: string
      isCompliant: boolean
      ngWordsCount: number
      piiDetected: number
      summary?: string
    } | null
  }>
}

/**
 * 処理中のファイルの進捗を監視するフック
 * 5秒間隔でポーリングし、Zustandストアを更新
 */
export function useProcessingStatus() {
  const files = useFileStore((state) => state.files)
  const updateFile = useFileStore((state) => state.updateFile)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 処理中のファイルを取得
  const getProcessingFileIds = useCallback(() => {
    return files
      .filter(
        (file) =>
          file.processingStatus !== "idle" &&
          file.processingStatus !== "complete" &&
          file.processingStatus !== "error"
      )
      .map((file) => file.id)
  }, [files])

  // 状態を取得して更新
  const fetchStatuses = useCallback(async () => {
    const processingIds = getProcessingFileIds()
    if (processingIds.length === 0) return

    try {
      const response = await fetch(
        `/api/process/status?fileIds=${processingIds.join(",")}`
      )
      const data: StatusResponse = await response.json()

      if (!data.success) {
        console.error("[useProcessingStatus] API error:", data)
        return
      }

      // 各ファイルの状態を更新
      for (const status of data.statuses) {
        if (status.status === "not_found") continue

        const updates: Parameters<typeof updateFile>[1] = {
          progress: status.progress,
          reportId: status.reportId || undefined,
        }

        // processingStatus のマッピング
        if (status.processingStatus) {
          updates.processingStatus = status.processingStatus as typeof updates.processingStatus
        }

        // 完了時は結果も更新
        if (status.status === "completed" && status.result) {
          updates.processingStatus = "complete"
          updates.result = {
            riskLevel: status.result.riskLevel as "none" | "low" | "medium" | "high" | "critical",
            isCompliant: status.result.isCompliant,
            ngWordsCount: status.result.ngWordsCount,
            piiDetected: status.result.piiDetected,
            summary: status.result.summary,
          }
        }

        // エラー時
        if (status.status === "error") {
          updates.processingStatus = "error"
          updates.error = "処理中にエラーが発生しました"
        }

        updateFile(status.fileId, updates)
      }
    } catch (error) {
      console.error("[useProcessingStatus] Fetch error:", error)
    }
  }, [getProcessingFileIds, updateFile])

  // ポーリング開始/停止
  useEffect(() => {
    const processingIds = getProcessingFileIds()

    if (processingIds.length > 0) {
      // 即座に1回実行
      fetchStatuses()

      // 5秒間隔でポーリング
      intervalRef.current = setInterval(fetchStatuses, 5000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchStatuses, getProcessingFileIds])

  return {
    processingCount: getProcessingFileIds().length,
    refresh: fetchStatuses,
  }
}
