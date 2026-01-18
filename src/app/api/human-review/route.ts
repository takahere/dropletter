import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createHumanReviewCheckout } from '@/lib/stripe/helpers'
import { HUMAN_REVIEW_PRICE } from '@/lib/stripe/client'

// Get user's human review requests
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
    const status = searchParams.get('status')
    const reportId = searchParams.get('report_id')

    let query = supabase
      .from('human_review_requests')
      .select(`
        *,
        report:reports(id, file_name, status),
        expert:experts(id, name, title, specialties)
      `)
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (reportId) {
      query = query.eq('report_id', reportId)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('Human review requests fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      requests: requests || [],
    })
  } catch (error) {
    console.error('Human review API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new human review request
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
    const { report_id, notes, priority = 'normal' } = body

    if (!report_id) {
      return NextResponse.json(
        { success: false, error: 'report_id is required' },
        { status: 400 }
      )
    }

    // Verify report exists and user has access
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

    // Check if there's already a pending/in-progress request for this report
    const { data: existingRequest } = await supabase
      .from('human_review_requests')
      .select('id, status')
      .eq('report_id', report_id)
      .in('status', ['pending', 'assigned', 'in_progress'])
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: 'このレポートには既に有人判定のリクエストがあります' },
        { status: 400 }
      )
    }

    // Calculate due date (24 hours for normal, 12 hours for urgent)
    const dueAt = new Date()
    dueAt.setHours(dueAt.getHours() + (priority === 'urgent' ? 12 : 24))

    // Create the request
    const { data: reviewRequest, error: createError } = await supabase
      .from('human_review_requests')
      .insert({
        report_id,
        requester_id: user.id,
        notes,
        priority,
        due_at: dueAt.toISOString(),
        amount_cents: HUMAN_REVIEW_PRICE.amountCents,
      })
      .select()
      .single()

    if (createError) {
      console.error('Human review request creation error:', createError)
      return NextResponse.json(
        { success: false, error: 'リクエストの作成に失敗しました' },
        { status: 500 }
      )
    }

    // Log activity
    const serviceClient = createServiceClient()
    await serviceClient.rpc('log_activity', {
      p_user_id: user.id,
      p_org_id: null,
      p_action_type: 'human_review.requested',
      p_target_type: 'human_review',
      p_target_id: reviewRequest.id,
      p_metadata: { report_id, priority },
    })

    // Create Stripe checkout for payment
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    let checkoutUrl: string | null = null
    try {
      checkoutUrl = await createHumanReviewCheckout(
        user.id,
        user.email!,
        reviewRequest.id,
        `${origin}/reviews/${reviewRequest.id}`
      )
    } catch (stripeError) {
      console.error('Stripe checkout creation failed:', stripeError)
      // Don't fail the request, just return without checkout URL
    }

    return NextResponse.json({
      success: true,
      review_request: reviewRequest,
      checkout_url: checkoutUrl,
      message: '有人判定リクエストを作成しました。お支払い後に専門家がアサインされます。',
    })
  } catch (error) {
    console.error('Human review API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
