import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAllGuidelines, getGuidelineById } from "@/lib/legal-guidelines"
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
    const legalJudgment = deepReason.legalJudgment || {}
    const fastCheck = resultJson.fastCheck || {}
    const masked = resultJson.masked || {}

    // チェック結果を生成
    const checks: ClearReportCheck[] = []
    const guidelines = getAllGuidelines()

    // 1. 個人情報保護法チェック
    const piiGuideline = getGuidelineById("kojinjouhou")
    const piiCount = masked.statistics?.totalDetected || 0
    checks.push({
      category: "個人情報保護法",
      status: piiCount === 0 ? "pass" : piiCount <= 3 ? "warning" : "fail",
      details: piiCount === 0
        ? "個人情報は検出されませんでした"
        : `${piiCount}件の個人情報が検出されました`,
      guideline: piiGuideline ? {
        name: piiGuideline.name,
        url: piiGuideline.url,
        statute: piiGuideline.statute,
        authority: piiGuideline.authority,
      } : undefined,
    })

    // 2. NGワードチェック
    const ngWords = fastCheck.ngWords || []
    const ngWordCount = ngWords.length
    checks.push({
      category: "禁止表現",
      status: ngWordCount === 0 ? "pass" : ngWordCount <= 2 ? "warning" : "fail",
      details: ngWordCount === 0
        ? "禁止表現は検出されませんでした"
        : `${ngWordCount}件の禁止表現が検出されました: ${ngWords.map((w: { word: string }) => w.word).join(", ")}`,
    })

    // 3. 景品表示法チェック
    const keihinhyoGuideline = getGuidelineById("keihinhyo")
    const hasAdvertisingIssue = legalJudgment.issues?.some(
      (issue: { type: string }) =>
        issue.type.includes("誇大") ||
        issue.type.includes("優良誤認") ||
        issue.type.includes("有利誤認") ||
        issue.type.includes("景表法")
    )
    checks.push({
      category: "景品表示法",
      status: hasAdvertisingIssue ? "fail" : "pass",
      details: hasAdvertisingIssue
        ? "不当表示の疑いがあります"
        : "不当表示は検出されませんでした",
      guideline: keihinhyoGuideline ? {
        name: keihinhyoGuideline.name,
        url: keihinhyoGuideline.url,
        statute: keihinhyoGuideline.statute,
        authority: keihinhyoGuideline.authority,
      } : undefined,
    })

    // 4. 特定商取引法チェック
    const tokushohoGuideline = getGuidelineById("tokushoho")
    const hasCommercialIssue = legalJudgment.issues?.some(
      (issue: { type: string }) =>
        issue.type.includes("特商法") ||
        issue.type.includes("通信販売") ||
        issue.type.includes("クーリングオフ")
    )
    checks.push({
      category: "特定商取引法",
      status: hasCommercialIssue ? "warning" : "pass",
      details: hasCommercialIssue
        ? "特定商取引法に関する問題の可能性があります"
        : "特定商取引法に関する問題は検出されませんでした",
      guideline: tokushohoGuideline ? {
        name: tokushohoGuideline.name,
        url: tokushohoGuideline.url,
        statute: tokushohoGuideline.statute,
        authority: tokushohoGuideline.authority,
      } : undefined,
    })

    // 5. 信書判定
    const shinshoGuideline = getGuidelineById("shinsho")
    const hasShinshoIssue = legalJudgment.issues?.some(
      (issue: { type: string }) =>
        issue.type.includes("信書") || issue.type.includes("郵便法")
    )
    checks.push({
      category: "信書判定",
      status: hasShinshoIssue ? "warning" : "pass",
      details: hasShinshoIssue
        ? "信書に該当する可能性があります"
        : "信書の判定基準に該当しません",
      guideline: shinshoGuideline ? {
        name: shinshoGuideline.name,
        url: shinshoGuideline.url,
        statute: shinshoGuideline.statute,
        authority: shinshoGuideline.authority,
      } : undefined,
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
