"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Link2,
  Copy,
  Check,
  Lock,
  Unlock,
  Calendar,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ShareDialogProps {
  reportId: string
  isOpen: boolean
  onClose: () => void
}

interface ShareLink {
  id: string
  token: string
  expires_at: string
  require_auth: boolean
  view_count: number
}

export function ShareDialog({ reportId, isOpen, onClose }: ShareDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [existingLinks, setExistingLinks] = useState<ShareLink[]>([])
  const [copied, setCopied] = useState(false)
  const [requireAuth, setRequireAuth] = useState(true)
  const [expirationDays, setExpirationDays] = useState(7)
  const [error, setError] = useState<string | null>(null)

  // Load existing share links when dialog opens
  const loadExistingLinks = async () => {
    try {
      const response = await fetch(`/api/share?report_id=${reportId}`)
      if (response.ok) {
        const data = await response.json()
        setExistingLinks(data.share_links || [])
      }
    } catch {
      // Ignore errors loading existing links
    }
  }

  // Create new share link
  const createShareLink = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: reportId,
          require_auth: requireAuth,
          expires_in_days: expirationDays,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "共有リンクの作成に失敗しました")
      }

      const data = await response.json()
      setShareLink(data.share_link)
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  // Copy share link to clipboard
  const copyShareLink = async () => {
    if (!shareLink) return

    const url = `${window.location.origin}/s/${shareLink.token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textArea = document.createElement("textarea")
      textArea.value = url
      textArea.style.position = "fixed"
      textArea.style.left = "-9999px"
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Delete share link
  const deleteShareLink = async (token: string) => {
    try {
      const response = await fetch(`/api/share/${token}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setExistingLinks((prev) => prev.filter((l) => l.token !== token))
        if (shareLink?.token === token) {
          setShareLink(null)
        }
      }
    } catch {
      // Ignore errors
    }
  }

  // Load existing links on open
  useState(() => {
    if (isOpen) {
      loadExistingLinks()
    }
  })

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border rounded-xl shadow-lg max-w-md w-full mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Link2 className="w-5 h-5 text-[#FF3300]" />
              共有リンクを作成
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {shareLink ? (
              // Show created share link
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 dark:text-green-400 font-medium">
                    共有リンクを作成しました
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/s/${shareLink.token}`}
                    className="flex-1 px-3 py-2 bg-muted border rounded-lg text-sm"
                  />
                  <button
                    onClick={copyShareLink}
                    className={cn(
                      "px-4 py-2 rounded-lg transition-colors flex items-center gap-2",
                      copied
                        ? "bg-green-500 text-white"
                        : "bg-[#FF3300] text-white hover:bg-[#FF3300]/90"
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        コピー済
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        コピー
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {shareLink.require_auth ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                    {shareLink.require_auth ? "ログイン必須" : "公開"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(shareLink.expires_at).toLocaleDateString("ja-JP")}まで
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <a
                    href={`/s/${shareLink.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    プレビュー
                  </a>
                  <button
                    onClick={() => setShareLink(null)}
                    className="flex-1 px-4 py-2 border hover:bg-muted rounded-lg transition-colors text-sm text-center"
                  >
                    新しいリンクを作成
                  </button>
                </div>
              </div>
            ) : (
              // Show create form
              <div className="space-y-4">
                {/* Auth requirement toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {requireAuth ? (
                      <Lock className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Unlock className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">ログインを要求</p>
                      <p className="text-xs text-muted-foreground">
                        {requireAuth
                          ? "閲覧にはログインが必要です"
                          : "誰でも閲覧できます"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setRequireAuth(!requireAuth)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      requireAuth ? "bg-[#FF3300]" : "bg-muted"
                    )}
                  >
                    <motion.div
                      animate={{ x: requireAuth ? 24 : 2 }}
                      className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                    />
                  </button>
                </div>

                {/* Expiration days selector */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    有効期限
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 7, 14, 30].map((days) => (
                      <button
                        key={days}
                        onClick={() => setExpirationDays(days)}
                        className={cn(
                          "px-2 sm:px-3 py-2 text-sm rounded-lg transition-colors",
                          expirationDays === days
                            ? "bg-[#FF3300] text-white"
                            : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        {days}日
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={createShareLink}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FF3300] text-white rounded-lg hover:bg-[#FF3300]/90 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      <Link2 className="w-5 h-5" />
                      共有リンクを作成
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Existing links */}
            {existingLinks.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium mb-3">既存の共有リンク</h3>
                <div className="space-y-2">
                  {existingLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {link.require_auth ? (
                          <Lock className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Unlock className="w-4 h-4 text-green-500" />
                        )}
                        <span className="text-muted-foreground">
                          {new Date(link.expires_at).toLocaleDateString("ja-JP")}まで
                        </span>
                        <span className="text-xs">({link.view_count}回閲覧)</span>
                      </div>
                      <button
                        onClick={() => deleteShareLink(link.token)}
                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
