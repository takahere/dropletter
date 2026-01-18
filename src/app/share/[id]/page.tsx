import { Metadata } from "next"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/server"
import { ReportView } from "@/components/report-view"
import { Footer } from "@/components/footer"
import { notFound } from "next/navigation"
import Link from "next/link"

const ImagePreview = dynamic(
  () => import("@/components/command-center/image-preview").then((mod) => mod.ImagePreview),
  { ssr: false, loading: () => <div className="p-4 text-muted-foreground">画像を読み込み中...</div> }
)

const PdfViewerWithComments = dynamic(
  () => import("@/components/command-center/pdf-viewer-with-comments").then((mod) => mod.PdfViewerWithComments),
  { ssr: false, loading: () => <div className="p-4 text-muted-foreground">PDFを読み込み中...</div> }
)

function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split(".").pop()
  return ["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "")
}

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

  const supabase = await createClient()
  const { data: report } = await supabase
    .from("reports")
    .select("file_name")
    .eq("id", id)
    .single()

  const title = report
    ? `${report.file_name} - DropLetter解析結果`
    : "DropLetter - ドキュメント解析結果"

  return {
    title,
    description: "AIによるドキュメント解析・法的チェック結果",
    openGraph: {
      title,
      description: "AIによるドキュメント解析・法的チェック結果を確認できます",
      images: [`${baseUrl}/api/og?id=${id}`],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "AIによるドキュメント解析・法的チェック結果",
      images: [`${baseUrl}/api/og?id=${id}`],
    },
  }
}

export default async function SharePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: report, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !report) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF3300] flex items-center justify-center">
              <span className="text-white text-lg">✨</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">DropLetter</h1>
              <p className="text-xs text-muted-foreground">
                AI Document Processor
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>解析結果</span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded">
              {report.status === "edited" ? "編集済み" : "完了"}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* ドキュメントプレビュー */}
        <div className="mb-8 bg-card border rounded-xl overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">ドキュメントプレビュー</h2>
          </div>
          <div className="p-4">
            {isImageFile(report.file_name) ? (
              <ImagePreview reportId={report.id} />
            ) : (
              <PdfViewerWithComments
                reportId={report.id}
                problems={{
                  ngWords: report.result_json?.fastCheck?.ngWords || [],
                  piiEntities: report.result_json?.masked?.detectedEntities || [],
                  legalIssues: report.result_json?.deepReason?.legalJudgment?.issues || [],
                }}
                serverHighlights={report.result_json?.highlights}
              />
            )}
          </div>
        </div>

        <ReportView report={report} editable={true} />
      </div>

      {/* フッター */}
      <Footer />
    </main>
  )
}
