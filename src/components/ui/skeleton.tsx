'use client'

import { cn } from '@/lib/utils'

/**
 * 基本スケルトン
 */
interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-200 dark:bg-slate-700',
        className
      )}
    />
  )
}

/**
 * テキスト行スケルトン
 */
interface SkeletonTextProps {
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}

/**
 * カードスケルトン
 */
interface SkeletonCardProps {
  className?: string
  hasImage?: boolean
}

export function SkeletonCard({ className, hasImage }: SkeletonCardProps) {
  return (
    <div className={cn('bg-card border rounded-xl p-6', className)}>
      {hasImage && <Skeleton className="w-full h-40 mb-4" />}
      <Skeleton className="h-6 w-3/4 mb-4" />
      <SkeletonText lines={2} />
    </div>
  )
}

/**
 * リストアイテムスケルトン
 */
export function SkeletonListItem({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-4 p-4', className)}>
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}

/**
 * テーブル行スケルトン
 */
interface SkeletonTableRowProps {
  columns?: number
  className?: string
}

export function SkeletonTableRow({ columns = 4, className }: SkeletonTableRowProps) {
  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/**
 * BillingView用スケルトン
 */
export function BillingViewSkeleton() {
  return (
    <div className="space-y-8">
      {/* 現在のプラン */}
      <div className="bg-card border rounded-xl p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-20 w-full mt-4" />
      </div>

      {/* プラン比較 */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-28" />
        <div className="grid md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  )
}

/**
 * HistoryView用スケルトン
 */
export function HistoryViewSkeleton() {
  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* リスト */}
      <div className="bg-card border rounded-xl divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>
    </div>
  )
}

/**
 * ReportView用スケルトン
 */
export function ReportViewSkeleton() {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 bg-muted/50 rounded-lg">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* セクション */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card border rounded-xl p-4">
          <Skeleton className="h-6 w-40" />
        </div>
      ))}
    </div>
  )
}

/**
 * ShareDialog用スケルトン
 */
export function ShareDialogSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-12 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 flex-1" />
          ))}
        </div>
      </div>
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
