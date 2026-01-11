import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Props = {
  params: Promise<{ id: string }>
}

/**
 * Reports API - レポートの取得・更新
 * GET: レポートを取得
 * PATCH: Human-in-the-loop編集を保存
 */
export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "レポートが見つかりません" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      report: data,
    })
  } catch (error) {
    console.error("[Reports] GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "取得に失敗しました",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const body = await req.json()
    const { humanEdits, resultJson } = body

    const supabase = await createClient()

    // 更新データを構築
    const updateData: Record<string, unknown> = {
      status: "edited",
    }

    if (humanEdits !== undefined) {
      updateData.human_edits = humanEdits
    }

    if (resultJson !== undefined) {
      updateData.result_json = resultJson
    }

    const { data, error } = await supabase
      .from("reports")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[Reports] Update error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: data,
    })
  } catch (error) {
    console.error("[Reports] PATCH error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "更新に失敗しました",
      },
      { status: 500 }
    )
  }
}
