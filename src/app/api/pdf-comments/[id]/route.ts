import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ id: string }>
}

// Get a single PDF comment
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: comment, error } = await supabase
      .from('pdf_comments')
      .select(`
        *,
        user:auth.users(email, raw_user_meta_data),
        replies:pdf_comments(*, user:auth.users(email, raw_user_meta_data))
      `)
      .eq('id', id)
      .single()

    if (error || !comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      comment,
    })
  } catch (error) {
    console.error('PDF comment API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update a PDF comment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content, is_resolved } = body

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (content !== undefined) updateData.content = content
    if (is_resolved !== undefined) updateData.is_resolved = is_resolved

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update comment (RLS ensures user can only update their own)
    const { data: comment, error } = await supabase
      .from('pdf_comments')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        user:auth.users(email, raw_user_meta_data)
      `)
      .single()

    if (error) {
      console.error('PDF comment update error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update comment' },
        { status: 500 }
      )
    }

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found or not authorized' },
        { status: 404 }
      )
    }

    // Log activity if resolving
    if (is_resolved !== undefined) {
      const serviceClient = createServiceClient()
      await serviceClient.rpc('log_activity', {
        p_user_id: user.id,
        p_org_id: null,
        p_action_type: 'comment.resolved',
        p_target_type: 'comment',
        p_target_id: id,
        p_metadata: { is_resolved },
      })
    }

    return NextResponse.json({
      success: true,
      comment,
    })
  } catch (error) {
    console.error('PDF comment API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete a PDF comment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get comment info before deletion for logging
    const { data: existingComment } = await supabase
      .from('pdf_comments')
      .select('report_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingComment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found or not authorized' },
        { status: 404 }
      )
    }

    // Delete comment (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from('pdf_comments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('PDF comment delete error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete comment' },
        { status: 500 }
      )
    }

    // Log activity
    const serviceClient = createServiceClient()
    await serviceClient.rpc('log_activity', {
      p_user_id: user.id,
      p_org_id: null,
      p_action_type: 'comment.deleted',
      p_target_type: 'comment',
      p_target_id: id,
      p_metadata: { report_id: existingComment.report_id },
    })

    return NextResponse.json({
      success: true,
      message: 'Comment deleted',
    })
  } catch (error) {
    console.error('PDF comment API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
