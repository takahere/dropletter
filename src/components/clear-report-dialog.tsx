"use client"

import { useState, useCallback, useEffect } from "react"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Loader2,
  Shield,
  ExternalLink,
  FileCheck,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ClearReportCheck {
  category: string
  status: "pass" | "warning" | "fail"
  details: string
  guideline?: {
    name: string
    url: string
    statute: string
    authority: string
  }
}

interface ClearReport {
  reportId: string
  fileName: string
  generatedAt: string
  status: "clear" | "conditional_clear" | "not_clear"
  checks: ClearReportCheck[]
  summary: string
  postalWorkerNote: string
  signature: {
    timestamp: string
    hash: string
  }
}

interface ClearReportDialogProps {
  reportId: string
  fileName: string
  isOpen: boolean
  onClose: () => void
}

const statusConfig = {
  clear: {
    label: "法的クリア",
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    icon: CheckCircle2,
  },
  conditional_clear: {
    label: "条件付きクリア",
    color: "text-yellow-600",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-200 dark:border-yellow-800",
    icon: AlertTriangle,
  },
  not_clear: {
    label: "要修正",
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    icon: XCircle,
  },
}

const checkStatusIcon = {
  pass: { icon: CheckCircle2, color: "text-green-500" },
  warning: { icon: AlertTriangle, color: "text-yellow-500" },
  fail: { icon: XCircle, color: "text-red-500" },
}

export function ClearReportDialog({
  reportId,
  fileName,
  isOpen,
  onClose,
}: ClearReportDialogProps) {
  const [report, setReport] = useState<ClearReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/reports/${reportId}/clear-report`)
      if (!response.ok) {
        throw new Error("Failed to fetch report")
      }
      const data = await response.json()
      setReport(data.clearReport)
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }, [reportId])

  // ダイアログが開いたときにレポートを取得
  useEffect(() => {
    if (isOpen && !report) {
      fetchReport()
    }
  }, [isOpen, report, fetchReport])

  const handleDownload = useCallback(() => {
    if (!report) return

    // HTMLとしてレポートを生成
    const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>法的クリアレポート - ${report.fileName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 12px; }
    .status-clear { color: #16a34a; }
    .status-conditional_clear { color: #ca8a04; }
    .status-not_clear { color: #dc2626; }
    .check { padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
    .check-pass { background: #f0fdf4; border-color: #bbf7d0; }
    .check-warning { background: #fefce8; border-color: #fef08a; }
    .check-fail { background: #fef2f2; border-color: #fecaca; }
    .signature { margin-top: 30px; padding: 15px; background: #f1f5f9; border-radius: 8px; font-size: 12px; color: #64748b; }
    .guideline-link { color: #2563eb; text-decoration: none; }
    .guideline-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <h1>法的クリアレポート</h1>
    <p>ファイル: ${report.fileName}</p>
    <p>生成日時: ${new Date(report.generatedAt).toLocaleString("ja-JP")}</p>
    <h2 class="status-${report.status}">${statusConfig[report.status].label}</h2>
  </div>

  <h3>サマリー</h3>
  <p>${report.summary}</p>

  <h3>チェック結果</h3>
  ${report.checks
    .map(
      (check) => `
    <div class="check check-${check.status}">
      <strong>${check.category}</strong>: ${check.status === "pass" ? "OK" : check.status === "warning" ? "注意" : "NG"}<br>
      <p>${check.details}</p>
      ${
        check.guideline
          ? `<p>参照: <a class="guideline-link" href="${check.guideline.url}" target="_blank">${check.guideline.name}（${check.guideline.authority}）</a></p>`
          : ""
      }
    </div>
  `
    )
    .join("")}

  <h3>郵便配達員向けノート</h3>
  <p>${report.postalWorkerNote}</p>

  <div class="signature">
    <strong>電子署名</strong><br>
    タイムスタンプ: ${report.signature.timestamp}<br>
    ハッシュ: ${report.signature.hash}
  </div>
</body>
</html>
`

    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `clear-report-${report.fileName.replace(/\.pdf$/, "")}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [report])

  if (!isOpen) return null

  const config = report ? statusConfig[report.status] : null
  const StatusIcon = config?.icon || Shield

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold">法的クリアレポート</h2>
              <p className="text-sm text-muted-foreground truncate max-w-md">
                {fileName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">
                レポートを生成中...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {report && config && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div
                className={cn(
                  "p-4 rounded-xl border flex items-center gap-4",
                  config.bg,
                  config.border
                )}
              >
                <div
                  className={cn(
                    "p-3 rounded-full",
                    config.bg
                  )}
                >
                  <StatusIcon className={cn("w-8 h-8", config.color)} />
                </div>
                <div>
                  <h3 className={cn("text-lg font-bold", config.color)}>
                    {config.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {report.summary}
                  </p>
                </div>
              </div>

              {/* Checks */}
              <div>
                <h4 className="font-medium mb-3">チェック結果</h4>
                <div className="space-y-2">
                  {report.checks.map((check, index) => {
                    const CheckIcon = checkStatusIcon[check.status].icon
                    return (
                      <div
                        key={index}
                        className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <CheckIcon
                            className={cn(
                              "w-5 h-5 flex-shrink-0 mt-0.5",
                              checkStatusIcon[check.status].color
                            )}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{check.category}</p>
                            <p className="text-sm text-muted-foreground">
                              {check.details}
                            </p>
                            {check.guideline && (
                              <a
                                href={check.guideline.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                              >
                                {check.guideline.name}（{check.guideline.authority}）
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Postal Worker Note */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  配達担当者向けノート
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {report.postalWorkerNote}
                </p>
              </div>

              {/* Signature */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">電子署名</span>
                  <br />
                  生成日時: {new Date(report.signature.timestamp).toLocaleString("ja-JP")}
                  <br />
                  ハッシュ: <code className="text-xs">{report.signature.hash.substring(0, 32)}...</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {report && (
          <div className="p-4 border-t dark:border-slate-800 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              閉じる
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              レポートをダウンロード
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
