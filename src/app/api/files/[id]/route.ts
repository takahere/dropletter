import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseServer } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

type Props = {
  params: Promise<{ id: string }>
}

// Supabase Admin Client (Service Role - bypasses RLS)
function createSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Files API - PDFファイルを配信
 * GET: reportIdからファイルを取得して返す（Supabase Storageから）
 */
export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params

    const supabase = await createSupabaseServer()

    // reportIdからfile_pathを取得
    const { data: report, error } = await supabase
      .from("reports")
      .select("file_path")
      .eq("id", id)
      .single()

    if (error || !report?.file_path) {
      console.error("[Files] Report not found:", id, error)
      return NextResponse.json(
        { success: false, error: "ファイルが見つかりません" },
        { status: 404 }
      )
    }

    // file_path形式: "uploads/uuid.pdf" -> bucket="uploads", path="uuid.pdf"
    const storagePath = report.file_path
    const [bucket, ...pathParts] = storagePath.split("/")
    const filePath = pathParts.join("/")

    console.log(`[Files] Downloading from storage: bucket=${bucket}, path=${filePath}`)

    // Supabase Storageからファイルをダウンロード（Admin clientを使用）
    const adminClient = createSupabaseAdmin()
    const { data, error: downloadError } = await adminClient.storage
      .from(bucket)
      .download(filePath)

    if (downloadError || !data) {
      console.error("[Files] Storage download failed:", downloadError)
      return NextResponse.json(
        { success: false, error: "ファイルのダウンロードに失敗しました" },
        { status: 404 }
      )
    }

    // ファイルを返す
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[Files] GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "ファイル取得に失敗しました",
      },
      { status: 500 }
    )
  }
}
