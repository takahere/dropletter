import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ token: string }>
}

// Get report by share token
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const supabase = await createClient()
    const serviceClient = createServiceClient()

    // Get share link
    const { data: shareLink, error: shareLinkError } = await serviceClient
      .from('share_links')
      .select('*, report:reports(*)')
      .eq('token', token)
      .single()

    if (shareLinkError || !shareLink) {
      return NextResponse.json(
        { success: false, error: '共有リンクが見つかりません', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check expiration
    if (new Date(shareLink.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'この共有リンクは期限切れです', code: 'EXPIRED' },
        { status: 410 }
      )
    }

    // Check auth requirement
    if (shareLink.require_auth) {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: 'このコンテンツを表示するにはログインが必要です',
            code: 'AUTH_REQUIRED',
            share_link: {
              id: shareLink.id,
              require_auth: true,
              expires_at: shareLink.expires_at,
            },
          },
          { status: 401 }
        )
      }
    }

    // Increment view count
    await serviceClient
      .from('share_links')
      .update({ view_count: (shareLink.view_count || 0) + 1 })
      .eq('id', shareLink.id)

    // Log activity
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await serviceClient.rpc('log_activity', {
        p_user_id: user.id,
        p_org_id: null,
        p_action_type: 'report.viewed',
        p_target_type: 'report',
        p_target_id: shareLink.report_id,
        p_metadata: { via: 'share_link', share_link_id: shareLink.id },
      })
    }

    return NextResponse.json({
      success: true,
      share_link: {
        id: shareLink.id,
        expires_at: shareLink.expires_at,
        view_count: shareLink.view_count + 1,
        created_by: shareLink.created_by,
      },
      report: shareLink.report,
    })
  } catch (error) {
    console.error('Share token API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete share link
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Delete share link (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from('share_links')
      .delete()
      .eq('token', token)
      .eq('created_by', user.id)

    if (error) {
      console.error('Share link delete error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete share link' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '共有リンクを削除しました',
    })
  } catch (error) {
    console.error('Share token API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
