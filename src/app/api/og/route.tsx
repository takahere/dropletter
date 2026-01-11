import { ImageResponse } from "@vercel/og"
import { createClient } from "@supabase/supabase-js"

export const runtime = "edge"

// Edge Runtimeではcookiesが使えないため、直接Supabaseクライアントを作成
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              color: "white",
              fontSize: 48,
            }}
          >
            DropLetter - AI Document Processor
          </div>
        ),
        { width: 1200, height: 630 }
      )
    }

    // Supabaseからレポートを取得
    const supabase = getSupabaseClient()
    const { data: report } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single()

    // レポートが見つからない場合のデフォルト表示
    if (!report) {
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              color: "white",
            }}
          >
            <div style={{ fontSize: 48, fontWeight: "bold" }}>DropLetter</div>
            <div style={{ fontSize: 24, color: "#94a3b8", marginTop: 16 }}>
              レポートが見つかりません
            </div>
          </div>
        ),
        { width: 1200, height: 630 }
      )
    }

    const result = report.result_json as {
      deepReason?: {
        legalJudgment?: {
          riskLevel?: string
          isCompliant?: boolean
          issues?: Array<{ type: string; description: string }>
        }
      }
      fastCheck?: {
        ngWords?: Array<{ word: string }>
      }
      masked?: {
        statistics?: {
          totalDetected?: number
        }
      }
    }

    const riskLevel = result?.deepReason?.legalJudgment?.riskLevel || "不明"
    const isCompliant = result?.deepReason?.legalJudgment?.isCompliant ?? false
    const ngWordsCount = result?.fastCheck?.ngWords?.length || 0
    const issuesCount = result?.deepReason?.legalJudgment?.issues?.length || 0
    const piiCount = result?.masked?.statistics?.totalDetected || 0

    // リスクレベルに応じた色
    const getRiskColor = (level: string) => {
      switch (level.toLowerCase()) {
        case "low":
          return "#22c55e"
        case "medium":
          return "#eab308"
        case "high":
          return "#ef4444"
        default:
          return "#94a3b8"
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            padding: 60,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "#FF3300",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              ✨
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{ color: "white", fontSize: 36, fontWeight: "bold" }}
              >
                DropLetter
              </span>
              <span style={{ color: "#94a3b8", fontSize: 18 }}>
                AI Document Processor
              </span>
            </div>
          </div>

          {/* Main content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 24,
            }}
          >
            <div
              style={{
                color: "white",
                fontSize: 52,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              ドキュメント解析結果
            </div>

            {/* Stats Grid */}
            <div style={{ display: "flex", gap: 24 }}>
              {/* Risk Level */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: 24,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  minWidth: 180,
                }}
              >
                <span style={{ color: "#94a3b8", fontSize: 18 }}>
                  リスクレベル
                </span>
                <span
                  style={{
                    color: getRiskColor(riskLevel),
                    fontSize: 36,
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}
                >
                  {riskLevel === "low"
                    ? "低"
                    : riskLevel === "medium"
                    ? "中"
                    : riskLevel === "high"
                    ? "高"
                    : riskLevel}
                </span>
              </div>

              {/* Compliance */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: 24,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  minWidth: 180,
                }}
              >
                <span style={{ color: "#94a3b8", fontSize: 18 }}>
                  コンプライアンス
                </span>
                <span
                  style={{
                    color: isCompliant ? "#22c55e" : "#ef4444",
                    fontSize: 36,
                    fontWeight: "bold",
                  }}
                >
                  {isCompliant ? "適合" : "要確認"}
                </span>
              </div>

              {/* NG Words */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: 24,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  minWidth: 180,
                }}
              >
                <span style={{ color: "#94a3b8", fontSize: 18 }}>NGワード</span>
                <span
                  style={{
                    color: ngWordsCount === 0 ? "#22c55e" : "#ef4444",
                    fontSize: 36,
                    fontWeight: "bold",
                  }}
                >
                  {ngWordsCount}件
                </span>
              </div>

              {/* Issues */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: 24,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  minWidth: 180,
                }}
              >
                <span style={{ color: "#94a3b8", fontSize: 18 }}>問題点</span>
                <span
                  style={{
                    color: issuesCount === 0 ? "#22c55e" : "#eab308",
                    fontSize: 36,
                    fontWeight: "bold",
                  }}
                >
                  {issuesCount}件
                </span>
              </div>

              {/* PII Detected */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: 24,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  minWidth: 180,
                }}
              >
                <span style={{ color: "#94a3b8", fontSize: 18 }}>
                  個人情報検出
                </span>
                <span
                  style={{
                    color: piiCount === 0 ? "#22c55e" : "#eab308",
                    fontSize: 36,
                    fontWeight: "bold",
                  }}
                >
                  {piiCount}件
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#64748b", fontSize: 20 }}>
              AI Document Processor for Postal Compliance
            </span>
            <span style={{ color: "#64748b", fontSize: 18 }}>
              {report.file_name}
            </span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  } catch (error) {
    console.error("[OG] Error:", error)
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            color: "white",
            fontSize: 48,
          }}
        >
          DropLetter
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }
}
