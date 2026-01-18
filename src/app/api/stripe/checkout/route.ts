import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createSubscriptionCheckout,
  createHumanReviewCheckout,
} from '@/lib/stripe/helpers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, review_request_id } = body

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const returnUrl = `${origin}/billing`

    let checkoutUrl: string

    if (type === 'subscription') {
      checkoutUrl = await createSubscriptionCheckout(
        user.id,
        user.email!,
        returnUrl
      )
    } else if (type === 'human_review') {
      if (!review_request_id) {
        return NextResponse.json(
          { success: false, error: 'review_request_id is required for human review checkout' },
          { status: 400 }
        )
      }
      checkoutUrl = await createHumanReviewCheckout(
        user.id,
        user.email!,
        review_request_id,
        `${origin}/reviews/${review_request_id}`
      )
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid checkout type' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      checkout_url: checkoutUrl,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
