import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { HighlightComment, CreateCommentRequest } from "@/types/comments"

/**
 * Comments API - コメントの取得・作成
 * GET: レポートの全コメントを取得
 * POST: 新規コメントを作成
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params
    const supabase = await createClient()

    const { data: comments, error } = await supabase
      .from("highlight_comments")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[Comments] Fetch error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      comments: comments as HighlightComment[],
    })
  } catch (error) {
    console.error("[Comments] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "コメント取得に失敗しました",
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params
    const body: CreateCommentRequest = await request.json()
    const { highlight_id, content } = body

    if (!highlight_id || !content) {
      return NextResponse.json(
        { success: false, error: "highlight_id と content は必須です" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "コメントを追加するにはログインが必要です" },
        { status: 401 }
      )
    }

    const { data: comment, error } = await supabase
      .from("highlight_comments")
      .insert({
        report_id: reportId,
        user_id: user.id,
        highlight_id,
        content,
      })
      .select("*")
      .single()

    if (error) {
      console.error("[Comments] Insert error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      comment: comment as HighlightComment,
    })
  } catch (error) {
    console.error("[Comments] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "コメント作成に失敗しました",
      },
      { status: 500 }
    )
  }
}
