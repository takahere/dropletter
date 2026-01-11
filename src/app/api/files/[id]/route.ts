import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import fs from "fs"

type Props = {
  params: Promise<{ id: string }>
}

/**
 * Files API - PDFファイルを配信
 * GET: reportIdからファイルを取得して返す
 */
export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params

    const supabase = await createClient()

    // reportIdからfile_pathを取得
    const { data: report, error } = await supabase
      .from("reports")
      .select("file_path")
      .eq("id", id)
      .single()

    if (error || !report?.file_path) {
      return NextResponse.json(
        { success: false, error: "ファイルが見つかりません" },
        { status: 404 }
      )
    }

    // ファイルが存在するか確認
    if (!fs.existsSync(report.file_path)) {
      return NextResponse.json(
        { success: false, error: "ファイルが存在しません" },
        { status: 404 }
      )
    }

    // ファイルを読み込んで返す
    const fileBuffer = fs.readFileSync(report.file_path)

    return new NextResponse(fileBuffer, {
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
