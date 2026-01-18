'use client'

import { AlertCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ErrorCode } from '@/lib/errors'

type Severity = 'error' | 'warning' | 'info'

interface ErrorMessageProps {
  message: string
  code?: ErrorCode
  severity?: Severity
  onDismiss?: () => void
  className?: string
}

const severityConfig = {
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-400',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-400',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400',
    iconColor: 'text-blue-500',
  },
}

export function ErrorMessage({
  message,
  code,
  severity = 'error',
  onDismiss,
  className,
}: ErrorMessageProps) {
  const config = severityConfig[severity]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border',
        config.bg,
        config.border,
        className
      )}
      role="alert"
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', config.text)}>{message}</p>
        {code && (
          <p className="text-xs text-muted-foreground mt-1">
            エラーコード: {code}
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            'p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
            config.text
          )}
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

/**
 * インラインエラーメッセージ（フォームフィールド用）
 */
interface InlineErrorProps {
  message: string
  className?: string
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <p
      className={cn(
        'text-sm text-red-600 dark:text-red-400 flex items-center gap-1 mt-1',
        className
      )}
      role="alert"
    >
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {message}
    </p>
  )
}

/**
 * フルページエラー表示
 */
interface ErrorPageProps {
  title?: string
  message: string
  code?: ErrorCode
  actionLabel?: string
  onAction?: () => void
}

export function ErrorPage({
  title = 'エラーが発生しました',
  message,
  code,
  actionLabel = '再試行',
  onAction,
}: ErrorPageProps) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
        <XCircle className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-center mb-2">{title}</h1>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {message}
      </p>
      {code && (
        <p className="text-xs text-muted-foreground mb-6">
          エラーコード: {code}
        </p>
      )}
      {onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2 bg-[#FF3300] text-white rounded-lg hover:bg-[#FF3300]/90 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

/**
 * エラーバナー（ページ上部表示用）
 */
interface ErrorBannerProps {
  message: string
  onDismiss?: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="bg-red-500 text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
