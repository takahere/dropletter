"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Loader2, ImageIcon, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImagePreviewProps {
  reportId: string
  className?: string
}

export function ImagePreview({ reportId, className }: ImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        const response = await fetch(`/api/reports/${reportId}/image`)
        if (response.ok) {
          const data = await response.json()
          setImageUrl(data.url)
        } else {
          setError("画像の取得に失敗しました")
        }
      } catch (err) {
        setError("画像の取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }

    fetchImageUrl()
  }, [reportId])

  if (isLoading) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-16",
        "bg-gradient-to-b from-slate-50 to-slate-100",
        "dark:from-slate-900 dark:to-slate-950",
        "rounded-2xl",
        className
      )}>
        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          画像を読み込み中...
        </p>
      </div>
    )
  }

  if (error || !imageUrl) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-16",
        "bg-gradient-to-b from-red-50 to-red-100",
        "dark:from-red-900/20 dark:to-red-950/20",
        "rounded-2xl",
        className
      )}>
        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {error || "画像を表示できません"}
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      "relative w-full rounded-2xl overflow-hidden",
      "bg-gradient-to-b from-slate-50 to-slate-100",
      "dark:from-slate-900 dark:to-slate-950",
      className
    )}>
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={imageUrl}
          alt="Document preview"
          fill
          className="object-contain"
          unoptimized
        />
      </div>
    </div>
  )
}
