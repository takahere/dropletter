import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPortalSession } from '@/lib/stripe/helpers'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const returnUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/billing`
      : 'http://localhost:3000/billing'

    const portalUrl = await createPortalSession(
      user.id,
      user.email,
      returnUrl
    )

    return NextResponse.json({ success: true, url: portalUrl })
  } catch (error) {
    console.error('Stripe portal error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
