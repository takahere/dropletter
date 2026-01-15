import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const scope = searchParams.get('scope') || 'personal' // 'personal' | 'team'
    const organizationId = searchParams.get('organization_id')
    const actionType = searchParams.get('action_type')
    const targetType = searchParams.get('target_type')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build query
    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })

    // Scope filter
    if (scope === 'personal') {
      query = query.eq('user_id', user.id)
    } else if (scope === 'team' && organizationId) {
      // Get organization membership first
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single()

      if (!membership) {
        return NextResponse.json(
          { success: false, error: 'Not a member of this organization' },
          { status: 403 }
        )
      }

      query = query.eq('organization_id', organizationId)
    }

    // Additional filters
    if (actionType) {
      query = query.eq('action_type', actionType)
    }
    if (targetType) {
      query = query.eq('target_type', targetType)
    }
    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }
    if (toDate) {
      query = query.lte('created_at', toDate)
    }

    // Pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: logs, error, count } = await query

    if (error) {
      console.error('History fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('History API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
