import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Get PDF comments for a report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('report_id')

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'report_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get all comments for this report (including nested replies)
    const { data: comments, error } = await supabase
      .from('pdf_comments')
      .select(`
        *,
        user:auth.users(email, raw_user_meta_data)
      `)
      .eq('report_id', reportId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('PDF comments fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    // Organize comments into threads
    const rootComments = comments?.filter(c => !c.parent_id) || []
    const replies = comments?.filter(c => c.parent_id) || []

    const commentsWithReplies = rootComments.map(comment => ({
      ...comment,
      replies: replies.filter(r => r.parent_id === comment.id),
    }))

    return NextResponse.json({
      success: true,
      comments: commentsWithReplies,
    })
  } catch (error) {
    console.error('PDF comments API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new PDF comment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      report_id,
      page_number,
      x_position,
      y_position,
      content,
      parent_id,
    } = body

    // Validate required fields
    if (!report_id || page_number === undefined || x_position === undefined || y_position === undefined || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate position ranges
    if (x_position < 0 || x_position > 100 || y_position < 0 || y_position > 100) {
      return NextResponse.json(
        { success: false, error: 'Position must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('pdf_comments')
      .insert({
        report_id,
        user_id: user.id,
        page_number,
        x_position,
        y_position,
        content,
        parent_id: parent_id || null,
      })
      .select(`
        *,
        user:auth.users(email, raw_user_meta_data)
      `)
      .single()

    if (error) {
      console.error('PDF comment creation error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    // Log activity
    const serviceClient = createServiceClient()
    await serviceClient.rpc('log_activity', {
      p_user_id: user.id,
      p_org_id: null,
      p_action_type: 'comment.added',
      p_target_type: 'comment',
      p_target_id: comment.id,
      p_metadata: { report_id, page_number, is_pin_comment: true },
    })

    return NextResponse.json({
      success: true,
      comment,
    })
  } catch (error) {
    console.error('PDF comments API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
