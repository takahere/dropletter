import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

// Create a new share link
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
    const { report_id, expires_in_days = 7, require_auth = true } = body

    if (!report_id) {
      return NextResponse.json(
        { success: false, error: 'report_id is required' },
        { status: 400 }
      )
    }

    // Verify user owns this report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, user_id, file_name')
      .eq('id', report_id)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { success: false, error: 'レポートが見つかりません' },
        { status: 404 }
      )
    }

    // Check ownership (allow if user owns or if no owner)
    if (report.user_id && report.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'このレポートの共有権限がありません' },
        { status: 403 }
      )
    }

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expires_in_days)

    // Create share link
    const { data: shareLink, error: shareError } = await supabase
      .from('share_links')
      .insert({
        report_id,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        require_auth,
      })
      .select()
      .single()

    if (shareError) {
      console.error('Share link creation error:', shareError)
      return NextResponse.json(
        { success: false, error: '共有リンクの作成に失敗しました' },
        { status: 500 }
      )
    }

    // Log activity
    const serviceClient = createServiceClient()
    await serviceClient.rpc('log_activity', {
      p_user_id: user.id,
      p_org_id: null,
      p_action_type: 'report.shared',
      p_target_type: 'report',
      p_target_id: report_id,
      p_metadata: {
        share_link_id: shareLink.id,
        expires_in_days,
        require_auth,
      },
    })

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const shareUrl = `${origin}/s/${shareLink.token}`

    return NextResponse.json({
      success: true,
      share_link: shareLink,
      share_url: shareUrl,
    })
  } catch (error) {
    console.error('Share API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// List share links for a report
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('report_id')

    let query = supabase
      .from('share_links')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (reportId) {
      query = query.eq('report_id', reportId)
    }

    const { data: shareLinks, error } = await query

    if (error) {
      console.error('Share links fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch share links' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      share_links: shareLinks,
    })
  } catch (error) {
    console.error('Share API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
