import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Reports API - レポートの保存
 * POST: 新規レポートを保存
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fileName, filePath, resultJson } = body

    if (!fileName || !resultJson) {
      return NextResponse.json(
        { success: false, error: "必須パラメータが不足しています" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("reports")
      .insert({
        file_name: fileName,
        file_path: filePath,
        result_json: resultJson,
        status: "completed",
      })
      .select("id")
      .single()

    if (error) {
      console.error("[Reports] Insert error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const shareUrl = `${baseUrl}/share/${data.id}`

    return NextResponse.json({
      success: true,
      id: data.id,
      shareUrl,
    })
  } catch (error) {
    console.error("[Reports] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "保存に失敗しました",
      },
      { status: 500 }
    )
  }
}
