import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type RouteParams = {
  params: Promise<{ id: string }>
}

// Get a single human review request
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { data: reviewRequest, error } = await supabase
      .from('human_review_requests')
      .select(`
        *,
        report:reports(id, file_name, status, result_json),
        expert:experts(id, name, title, specialties, bio)
      `)
      .eq('id', id)
      .single()

    if (error || !reviewRequest) {
      return NextResponse.json(
        { success: false, error: 'Review request not found' },
        { status: 404 }
      )
    }

    // Check access: must be requester or assigned expert
    const isRequester = reviewRequest.requester_id === user.id
    const isExpert = reviewRequest.expert?.user_id === user.id

    if (!isRequester && !isExpert) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      review_request: reviewRequest,
    })
  } catch (error) {
    console.error('Human review API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update a human review request (cancel, rate, or expert update)
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

    // Get current request
    const { data: currentRequest, error: fetchError } = await supabase
      .from('human_review_requests')
      .select('*, expert:experts(user_id)')
      .eq('id', id)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json(
        { success: false, error: 'Review request not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const isRequester = currentRequest.requester_id === user.id
    const isExpert = currentRequest.expert?.user_id === user.id
    const serviceClient = createServiceClient()

    // Requester actions
    if (isRequester) {
      // Cancel request (only if pending)
      if (body.action === 'cancel') {
        if (currentRequest.status !== 'pending') {
          return NextResponse.json(
            { success: false, error: 'キャンセルできるのはペンディング状態のリクエストのみです' },
            { status: 400 }
          )
        }

        const { error: updateError } = await supabase
          .from('human_review_requests')
          .update({ status: 'canceled' })
          .eq('id', id)

        if (updateError) {
          return NextResponse.json(
            { success: false, error: 'Failed to cancel request' },
            { status: 500 }
          )
        }

        await serviceClient.rpc('log_activity', {
          p_user_id: user.id,
          p_org_id: null,
          p_action_type: 'human_review.canceled',
          p_target_type: 'human_review',
          p_target_id: id,
          p_metadata: {},
        })

        return NextResponse.json({
          success: true,
          message: 'リクエストをキャンセルしました',
        })
      }

      // Rate expert (only if completed)
      if (body.action === 'rate' && body.rating) {
        if (currentRequest.status !== 'completed') {
          return NextResponse.json(
            { success: false, error: '完了したリクエストのみ評価できます' },
            { status: 400 }
          )
        }

        const rating = parseInt(body.rating, 10)
        if (rating < 1 || rating > 5) {
          return NextResponse.json(
            { success: false, error: '評価は1〜5の範囲で入力してください' },
            { status: 400 }
          )
        }

        const { error: updateError } = await supabase
          .from('human_review_requests')
          .update({ expert_rating: rating })
          .eq('id', id)

        if (updateError) {
          return NextResponse.json(
            { success: false, error: 'Failed to rate' },
            { status: 500 }
          )
        }

        // Update expert's average rating
        if (currentRequest.expert_id) {
          await serviceClient.rpc('update_expert_rating', {
            p_expert_id: currentRequest.expert_id,
          })
        }

        return NextResponse.json({
          success: true,
          message: '評価を送信しました',
        })
      }
    }

    // Expert actions
    if (isExpert) {
      // Start working on request
      if (body.action === 'start') {
        if (currentRequest.status !== 'assigned') {
          return NextResponse.json(
            { success: false, error: 'アサインされたリクエストのみ開始できます' },
            { status: 400 }
          )
        }

        const { error: updateError } = await supabase
          .from('human_review_requests')
          .update({ status: 'in_progress' })
          .eq('id', id)

        if (updateError) {
          return NextResponse.json(
            { success: false, error: 'Failed to start' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'レビューを開始しました',
        })
      }

      // Complete review with comments
      if (body.action === 'complete' && body.expert_comments) {
        if (currentRequest.status !== 'in_progress') {
          return NextResponse.json(
            { success: false, error: '進行中のリクエストのみ完了できます' },
            { status: 400 }
          )
        }

        const { error: updateError } = await supabase
          .from('human_review_requests')
          .update({
            status: 'completed',
            expert_comments: body.expert_comments,
            completed_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (updateError) {
          return NextResponse.json(
            { success: false, error: 'Failed to complete' },
            { status: 500 }
          )
        }

        // Update expert's total reviews
        if (currentRequest.expert_id) {
          await serviceClient
            .from('experts')
            .update({
              total_reviews: (currentRequest.expert?.total_reviews || 0) + 1,
            })
            .eq('id', currentRequest.expert_id)
        }

        await serviceClient.rpc('log_activity', {
          p_user_id: user.id,
          p_org_id: null,
          p_action_type: 'human_review.completed',
          p_target_type: 'human_review',
          p_target_id: id,
          p_metadata: { expert_id: currentRequest.expert_id },
        })

        return NextResponse.json({
          success: true,
          message: 'レビューを完了しました',
        })
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Human review API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
