"use client"

import {
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { FileState, ProcessingStatus, RiskLevel } from "@/lib/stores/file-store"

interface FileCardProps {
  file: FileState
  onClick: () => void
  onRetry: () => void
}

// ステータスに応じたアイコンとテキスト
const statusConfig: Record<
  ProcessingStatus,
  { icon: React.ReactNode; label: string; color: string }
> = {
  idle: { icon: <FileText className="w-4 h-4" />, label: "待機中", color: "text-muted-foreground" },
  pending: { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: "開始待ち...", color: "text-blue-500" },
  parsing: { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: "ファイルを解析中...", color: "text-blue-500" },
  masking: { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: "マスキング中...", color: "text-blue-500" },
  "fast-check": { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: "NGワードチェック中...", color: "text-blue-500" },
  "deep-reason": { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: "法的判定中...", color: "text-blue-500" },
  complete: { icon: <CheckCircle className="w-4 h-4" />, label: "完了", color: "text-green-500" },
  error: { icon: <XCircle className="w-4 h-4" />, label: "エラー", color: "text-red-500" },
}

// リスクレベルに応じたバッジ
const riskBadge: Record<RiskLevel, { variant: "success" | "warning" | "danger" | "secondary"; label: string }> = {
  none: { variant: "success", label: "SAFE" },
  low: { variant: "success", label: "SAFE" },
  medium: { variant: "warning", label: "CAUTION" },
  high: { variant: "danger", label: "RISKY" },
  critical: { variant: "danger", label: "RISKY" },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// デフォルトのステータス設定
const defaultStatus = {
  icon: <Loader2 className="w-4 h-4 animate-spin" />,
  label: "処理中...",
  color: "text-blue-500",
}

export function FileCard({ file, onClick, onRetry }: FileCardProps) {
  // statusConfigに存在しないステータスの場合はデフォルト値を使用
  const status = statusConfig[file.processingStatus] || defaultStatus
  const isProcessing =
    file.processingStatus !== "idle" &&
    file.processingStatus !== "complete" &&
    file.processingStatus !== "error"
  const isComplete = file.processingStatus === "complete"
  const isError = file.processingStatus === "error"

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border bg-card cursor-pointer transition-all hover:shadow-md",
        isComplete && "border-green-200 bg-green-50/50 dark:bg-green-950/20",
        isError && "border-red-200 bg-red-50/50 dark:bg-red-950/20",
        isProcessing && "border-blue-200"
      )}
    >
      {/* ファイルアイコン */}
      <div
        className={cn(
          "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
          isComplete
            ? "bg-green-100 dark:bg-green-900/30"
            : isError
            ? "bg-red-100 dark:bg-red-900/30"
            : "bg-[#FF3300]/10"
        )}
      >
        <FileText
          className={cn(
            "w-6 h-6",
            isComplete
              ? "text-green-600"
              : isError
              ? "text-red-500"
              : "text-[#FF3300]"
          )}
        />
      </div>

      {/* ファイル情報 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium truncate" title={file.fileName}>
            {file.fileName}
          </p>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatFileSize(file.fileSize)}
          </span>
        </div>

        {/* プログレスバー（処理中のみ） */}
        {isProcessing && (
          <div className="mb-1">
            <Progress value={file.progress} className="h-1.5" />
          </div>
        )}

        {/* ステータス */}
        <div className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1.5 text-sm", status.color)}>
            {status.icon}
            <span>{status.label}</span>
          </span>

          {/* 完了時のNGワード数 */}
          {isComplete && file.result && file.result.ngWordsCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-600">
              <AlertTriangle className="w-3 h-3" />
              {file.result.ngWordsCount}件
            </span>
          )}

          {/* エラーメッセージ */}
          {isError && file.error && (
            <span className="text-xs text-red-500 truncate" title={file.error}>
              {file.error}
            </span>
          )}
        </div>
      </div>

      {/* 右側: リスクバッジ or リトライボタン */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {isComplete && file.result && (
          <Badge variant={riskBadge[file.result.riskLevel].variant}>
            {riskBadge[file.result.riskLevel].label}
          </Badge>
        )}

        {isError && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRetry()
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            リトライ
          </button>
        )}

        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </div>
  )
}
