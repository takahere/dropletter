"use client"

import { useEffect, useCallback, useRef } from "react"
import { useFileStore } from "@/lib/stores/file-store"

// タイムアウト設定（10分）
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000
// not_foundの最大回数
const MAX_NOT_FOUND_COUNT = 10

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
 * タイムアウト検出とnot_foundハンドリングを含む
 */
export function useProcessingStatus() {
  const files = useFileStore((state) => state.files)
  const updateFile = useFileStore((state) => state.updateFile)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const notFoundCountRef = useRef<Record<string, number>>({})

  // 処理中のファイルIDsを取得（useRefで安定化）
  const processingIdsRef = useRef<string[]>([])

  useEffect(() => {
    processingIdsRef.current = files
      .filter(
        (file) =>
          file.processingStatus !== "idle" &&
          file.processingStatus !== "complete" &&
          file.processingStatus !== "error"
      )
      .map((file) => file.id)
  }, [files])

  // 処理中のファイルを取得（外部API用）
  const getProcessingFileIds = useCallback(() => {
    return processingIdsRef.current
  }, [])

  // 状態を取得して更新
  const fetchStatuses = useCallback(async () => {
    const processingIds = processingIdsRef.current
    if (processingIds.length === 0 || !isMountedRef.current) return

    try {
      const response = await fetch(
        `/api/process/status?fileIds=${processingIds.join(",")}`
      )
      const data: StatusResponse = await response.json()

      if (!data.success || !isMountedRef.current) {
        console.error("[useProcessingStatus] API error:", data)
        return
      }

      // 各ファイルの状態を更新
      for (const status of data.statuses) {
        // not_found処理
        if (status.status === "not_found") {
          notFoundCountRef.current[status.fileId] =
            (notFoundCountRef.current[status.fileId] || 0) + 1

          // 一定回数not_foundが続いたらエラーに
          if (notFoundCountRef.current[status.fileId] >= MAX_NOT_FOUND_COUNT) {
            updateFile(status.fileId, {
              processingStatus: "error",
              error: "レポートが見つかりません。再アップロードしてください。",
            })
            delete notFoundCountRef.current[status.fileId]
          }
          continue
        }

        // 見つかったらカウンターリセット
        delete notFoundCountRef.current[status.fileId]

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
  }, [updateFile])

  // タイムアウトチェック
  const checkTimeouts = useCallback(() => {
    const now = Date.now()
    files.forEach((file) => {
      if (
        file.processingStatus !== "idle" &&
        file.processingStatus !== "complete" &&
        file.processingStatus !== "error"
      ) {
        const createdAt = new Date(file.createdAt).getTime()
        if (now - createdAt > PROCESSING_TIMEOUT_MS) {
          console.warn(`[useProcessingStatus] Timeout for file: ${file.fileName}`)
          updateFile(file.id, {
            processingStatus: "error",
            error: "処理がタイムアウトしました。再試行してください。",
          })
        }
      }
    })
  }, [files, updateFile])

  // ポーリング開始/停止
  useEffect(() => {
    isMountedRef.current = true

    const startPolling = () => {
      // 既存のインターバルをクリア
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // 即座に1回実行
      fetchStatuses()

      // 5秒間隔でポーリング
      intervalRef.current = setInterval(fetchStatuses, 5000)
    }

    if (processingIdsRef.current.length > 0) {
      startPolling()
    }

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchStatuses])

  // タイムアウトチェック（30秒ごと）
  useEffect(() => {
    timeoutIntervalRef.current = setInterval(checkTimeouts, 30000)

    return () => {
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current)
        timeoutIntervalRef.current = null
      }
    }
  }, [checkTimeouts])

  return {
    processingCount: getProcessingFileIds().length,
    refresh: fetchStatuses,
  }
}
