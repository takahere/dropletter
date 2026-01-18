import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { shinshoGuidelineInfo } from "@/lib/legal-guidelines"
import crypto from "crypto"

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params

  try {
    const supabase = await createClient()

    // レポートを取得
    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single()

    if (error || !report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      )
    }

    const resultJson = report.result_json || {}
    const deepReason = resultJson.deepReason || {}
    const shinshoJudgment = deepReason.shinshoJudgment || {}
    const masked = resultJson.masked || {}

    // チェック結果を生成（信書判定に特化）
    const checks: ClearReportCheck[] = []

    // 1. 信書判定（メインチェック）
    const isShinsho = shinshoJudgment.isShinsho ?? false
    const confidence = shinshoJudgment.confidence || "low"
    const documentType = shinshoJudgment.documentType || "不明"
    const reason = shinshoJudgment.reason || "判定理由なし"

    checks.push({
      category: "信書判定",
      status: isShinsho ? (confidence === "high" ? "fail" : "warning") : "pass",
      details: isShinsho
        ? `信書に該当します（確信度: ${confidence}）。文書種類: ${documentType}。${reason}`
        : `信書に該当しません。文書種類: ${documentType}。${reason}`,
      guideline: {
        name: shinshoGuidelineInfo.name,
        url: shinshoGuidelineInfo.url,
        statute: shinshoGuidelineInfo.statute,
        authority: shinshoGuidelineInfo.authority,
      },
    })

    // 2. 個人情報検出状況（参考情報）
    const piiCount = masked.statistics?.totalDetected || 0
    checks.push({
      category: "個人情報検出",
      status: piiCount === 0 ? "pass" : "warning",
      details: piiCount === 0
        ? "個人情報は検出されませんでした"
        : `${piiCount}件の個人情報が検出されました（マスキング済み）`,
    })

    // 総合ステータスを判定
    const hasFailure = checks.some((c) => c.status === "fail")
    const hasWarning = checks.some((c) => c.status === "warning")
    const overallStatus: ClearReport["status"] = hasFailure
      ? "not_clear"
      : hasWarning
      ? "conditional_clear"
      : "clear"

    // サマリーを生成
    const passCount = checks.filter((c) => c.status === "pass").length
    const warningCount = checks.filter((c) => c.status === "warning").length
    const failCount = checks.filter((c) => c.status === "fail").length

    const summary =
      overallStatus === "clear"
        ? `全${checks.length}項目のチェックをパスしました。法的リスクは低いと判断されます。`
        : overallStatus === "conditional_clear"
        ? `${passCount}項目パス、${warningCount}項目に注意が必要です。条件付きで送付可能ですが、確認を推奨します。`
        : `${failCount}項目で問題が検出されました。送付前に修正が必要です。`

    // 郵便配達員向けノート
    const postalWorkerNote =
      deepReason.postalWorkerExplanation ||
      (overallStatus === "clear"
        ? "このDMは法的チェックをパスしています。通常の配達手続きで問題ありません。"
        : overallStatus === "conditional_clear"
        ? "このDMには注意点があります。詳細は上記チェック結果を確認してください。"
        : "このDMには法的問題があります。送付前に送り主へ確認を取ることを推奨します。")

    // 署名を生成
    const timestamp = new Date().toISOString()
    const contentToSign = JSON.stringify({
      reportId,
      fileName: report.file_name,
      checks,
      status: overallStatus,
      timestamp,
    })
    const hash = crypto.createHash("sha256").update(contentToSign).digest("hex")

    const clearReport: ClearReport = {
      reportId,
      fileName: report.file_name,
      generatedAt: timestamp,
      status: overallStatus,
      checks,
      summary,
      postalWorkerNote,
      signature: {
        timestamp,
        hash,
      },
    }

    return NextResponse.json({ success: true, clearReport })
  } catch (error) {
    console.error("[clear-report] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate clear report" },
      { status: 500 }
    )
  }
}
