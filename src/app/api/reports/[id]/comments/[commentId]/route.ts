import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { HighlightComment, UpdateCommentRequest } from "@/types/comments"

/**
 * Single Comment API - コメントの更新・削除
 * PATCH: コメントを更新
 * DELETE: コメントを削除
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { commentId } = await params
    const body: UpdateCommentRequest = await request.json()

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 }
      )
    }

    // Verify ownership
    const { data: existingComment } = await supabase
      .from("highlight_comments")
      .select("user_id")
      .eq("id", commentId)
      .single()

    if (!existingComment || existingComment.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "このコメントを編集する権限がありません" },
        { status: 403 }
      )
    }

    // Build update object
    const updateData: Partial<HighlightComment> = {}
    if (body.content !== undefined) updateData.content = body.content
    if (body.is_resolved !== undefined) updateData.is_resolved = body.is_resolved

    const { data: comment, error } = await supabase
      .from("highlight_comments")
      .update(updateData)
      .eq("id", commentId)
      .select("*")
      .single()

    if (error) {
      console.error("[Comments] Update error:", error)
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
        error: error instanceof Error ? error.message : "コメント更新に失敗しました",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { commentId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 }
      )
    }

    // Verify ownership
    const { data: existingComment } = await supabase
      .from("highlight_comments")
      .select("user_id")
      .eq("id", commentId)
      .single()

    if (!existingComment || existingComment.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "このコメントを削除する権限がありません" },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from("highlight_comments")
      .delete()
      .eq("id", commentId)

    if (error) {
      console.error("[Comments] Delete error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Comments] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "コメント削除に失敗しました",
      },
      { status: 500 }
    )
  }
}
