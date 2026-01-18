import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params

  try {
    const supabase = createServiceClient()

    // レポートを取得してファイルパスを取得
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("file_path, file_name")
      .eq("id", reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      )
    }

    // file_path から bucket と path を取得
    // format: "uploads/uuid.ext"
    const filePath = report.file_path
    const [bucket, ...pathParts] = filePath.split("/")
    const storagePath = pathParts.join("/")

    // Supabase Storage から署名付きURLを生成（1時間有効）
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 3600)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[image] Failed to create signed URL:", signedUrlError)
      return NextResponse.json(
        { error: "Failed to get image URL" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: signedUrlData.signedUrl,
      fileName: report.file_name,
    })
  } catch (error) {
    console.error("[image] Error:", error)
    return NextResponse.json(
      { error: "Failed to get image" },
      { status: 500 }
    )
  }
}
