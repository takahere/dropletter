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
    const scope = searchParams.get('scope') || 'personal'
    const organizationId = searchParams.get('organization_id')
    const status = searchParams.get('status')
    const riskLevel = searchParams.get('risk_level')
    const search = searchParams.get('search')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build query
    let query = supabase
      .from('reports')
      .select('id, file_name, file_path, status, processing_status, created_at, updated_at, result_json->deepReason->legalJudgment->riskLevel', { count: 'exact' })

    // Scope filter
    if (scope === 'personal') {
      query = query.eq('user_id', user.id)
    } else if (scope === 'team' && organizationId) {
      // Verify membership
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
    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.ilike('file_name', `%${search}%`)
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

    const { data: reports, error, count } = await query

    if (error) {
      console.error('Reports history fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch reports' },
        { status: 500 }
      )
    }

    // Filter by risk level if specified (post-query because JSONB filtering is complex)
    let filteredReports = reports || []
    if (riskLevel) {
      filteredReports = filteredReports.filter(r => {
        const reportRiskLevel = (r as Record<string, unknown>).riskLevel
        return reportRiskLevel === riskLevel
      })
    }

    return NextResponse.json({
      success: true,
      reports: filteredReports,
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('Reports history API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
