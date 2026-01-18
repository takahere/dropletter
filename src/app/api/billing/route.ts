import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan, getSubscription, getUserProfile, canPerformCheck } from '@/lib/stripe/helpers'
import { PLANS } from '@/lib/stripe/client'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [plan, subscription, profile, checkPermission] = await Promise.all([
      getUserPlan(user.id),
      getSubscription(user.id),
      getUserProfile(user.id),
      canPerformCheck(user.id),
    ])

    return NextResponse.json({
      success: true,
      billing: {
        plan,
        plan_details: PLANS[plan],
        subscription: subscription ? {
          status: subscription.status,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
        } : null,
        usage: {
          free_checks_used: profile?.free_checks_used || 0,
          can_perform_check: checkPermission.allowed,
          check_blocked_reason: checkPermission.reason,
        },
      },
    })
  } catch (error) {
    console.error('Billing API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch billing info' },
      { status: 500 }
    )
  }
}
