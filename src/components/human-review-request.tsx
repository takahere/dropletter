"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  UserCheck,
  Clock,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface HumanReviewRequest {
  id: string
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'refunded'
  priority: 'normal' | 'urgent'
  due_at: string
  created_at: string
  expert?: {
    id: string
    name: string
    title: string
  }
  result_json?: unknown
}

interface HumanReviewRequestProps {
  reportId: string
  editable?: boolean
}

export function HumanReviewRequestCard({ reportId, editable = false }: HumanReviewRequestProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isRequesting, setIsRequesting] = useState(false)
  const [existingRequest, setExistingRequest] = useState<HumanReviewRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [showForm, setShowForm] = useState(false)

  // Fetch existing request
  useEffect(() => {
    async function fetchRequest() {
      try {
        const response = await fetch(`/api/human-review?report_id=${reportId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.requests && data.requests.length > 0) {
            setExistingRequest(data.requests[0])
          }
        }
      } catch {
        // Ignore errors
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequest()
  }, [reportId])

  // Request human review
  const handleRequest = async () => {
    setIsRequesting(true)
    setError(null)

    try {
      const response = await fetch('/api/human-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          notes,
          priority,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '有人判定のリクエストに失敗しました')
      }

      // If checkout URL is provided, redirect to Stripe
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        setExistingRequest(data.review_request)
        setShowForm(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setIsRequesting(false)
    }
  }

  const getStatusInfo = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'pending') {
      return {
        label: 'お支払い待ち',
        color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
        icon: Clock,
      }
    }

    switch (status) {
      case 'pending':
        return {
          label: '専門家を割り当て中',
          color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
          icon: Clock,
        }
      case 'assigned':
        return {
          label: '専門家がアサインされました',
          color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
          icon: UserCheck,
        }
      case 'in_progress':
        return {
          label: 'レビュー中',
          color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
          icon: Loader2,
        }
      case 'completed':
        return {
          label: '完了',
          color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
          icon: Check,
        }
      case 'cancelled':
        return {
          label: 'キャンセル',
          color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
          icon: AlertCircle,
        }
      default:
        return {
          label: '不明',
          color: 'text-gray-600 bg-gray-100',
          icon: AlertCircle,
        }
    }
  }

  if (isLoading) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">読み込み中...</span>
        </div>
      </div>
    )
  }

  // Show existing request status
  if (existingRequest) {
    const statusInfo = getStatusInfo(existingRequest.status, existingRequest.payment_status)
    const StatusIcon = statusInfo.icon

    return (
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
            <UserCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">有人判定</h3>
              <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", statusInfo.color)}>
                <StatusIcon className={cn("w-3 h-3", existingRequest.status === 'in_progress' && "animate-spin")} />
                {statusInfo.label}
              </div>
            </div>

            {existingRequest.expert && (
              <p className="text-sm text-muted-foreground mt-2">
                担当: {existingRequest.expert.name} ({existingRequest.expert.title})
              </p>
            )}

            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                期限: {new Date(existingRequest.due_at).toLocaleString('ja-JP')}
              </span>
              {existingRequest.priority === 'urgent' && (
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-medium">
                  緊急
                </span>
              )}
            </div>

            {existingRequest.status === 'completed' && Boolean(existingRequest.result_json) && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">専門家のレビュー結果</p>
                <p className="text-sm text-muted-foreground">
                  レビュー結果は上記の解析結果に反映されています。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show request form or CTA
  if (!editable) {
    return null
  }

  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
          <UserCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold">有人判定をリクエスト</h3>
          <p className="text-muted-foreground text-sm mt-1">
            専門家が24時間以内に詳細なチェックを行います。
          </p>

          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="text-sm font-medium">優先度</label>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setPriority('normal')}
                      className={cn(
                        "flex-1 px-4 py-2 text-sm rounded-lg transition-colors",
                        priority === 'normal'
                          ? "bg-[#FF3300] text-white"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      通常 (24時間)
                    </button>
                    <button
                      onClick={() => setPriority('urgent')}
                      className={cn(
                        "flex-1 px-4 py-2 text-sm rounded-lg transition-colors",
                        priority === 'urgent'
                          ? "bg-red-500 text-white"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      緊急 (12時間)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">備考 (任意)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="特に確認してほしい点があれば記載してください..."
                    className="w-full mt-2 px-4 py-3 bg-muted rounded-lg text-sm resize-none min-h-[80px]"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleRequest}
                    disabled={isRequesting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#FF3300] text-white rounded-lg hover:bg-[#FF3300]/90 transition-colors text-sm disabled:opacity-50"
                  >
                    {isRequesting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        お支払いへ進む (¥3,000)
                        <ExternalLink className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 flex items-center justify-between"
              >
                <div>
                  <span className="text-xl font-bold">¥3,000</span>
                  <span className="text-muted-foreground">/回</span>
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF3300] text-white rounded-lg hover:bg-[#FF3300]/90 transition-colors text-sm"
                >
                  <UserCheck className="w-4 h-4" />
                  リクエストする
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
