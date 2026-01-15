import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { stripe, PRICES, PLANS, HUMAN_REVIEW_PRICE } from './client'
import type { PlanType } from './client'
import type { UserProfile, Subscription } from '@/types/database'

/**
 * Get or create Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const supabase = await createSupabaseClient()

  // Check if user already has a Stripe customer ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  })

  // Save customer ID to profile
  await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      stripe_customer_id: customer.id,
    })

  return customer.id
}

/**
 * Create Stripe Checkout session for subscription
 */
export async function createSubscriptionCheckout(
  userId: string,
  email: string,
  returnUrl: string
): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(userId, email)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: PRICES.PRO_MONTHLY,
        quantity: 1,
      },
    ],
    success_url: `${returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?canceled=true`,
    metadata: {
      user_id: userId,
      type: 'subscription',
    },
  })

  return session.url!
}

/**
 * Create Stripe Checkout session for human review (one-time payment)
 */
export async function createHumanReviewCheckout(
  userId: string,
  email: string,
  reviewRequestId: string,
  returnUrl: string
): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(userId, email)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: HUMAN_REVIEW_PRICE.currency,
          product_data: {
            name: HUMAN_REVIEW_PRICE.description,
            description: '24時間以内に専門家がチェックを行います',
          },
          unit_amount: HUMAN_REVIEW_PRICE.amount,
        },
        quantity: 1,
      },
    ],
    success_url: `${returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?canceled=true`,
    metadata: {
      user_id: userId,
      type: 'human_review',
      review_request_id: reviewRequestId,
    },
  })

  return session.url!
}

/**
 * Create Stripe Customer Portal session
 */
export async function createPortalSession(
  userId: string,
  email: string,
  returnUrl: string
): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(userId, email)

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session.url
}

/**
 * Get user's current plan
 */
export async function getUserPlan(userId: string): Promise<PlanType> {
  const supabase = await createSupabaseClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (subscription && new Date(subscription.current_period_end!) > new Date()) {
    return 'pro'
  }

  return 'free'
}

/**
 * Check if user can perform a check (based on plan limits)
 */
export async function canPerformCheck(userId: string): Promise<{
  allowed: boolean
  reason?: string
  plan: PlanType
}> {
  const supabase = await createSupabaseClient()

  // Get user's plan
  const plan = await getUserPlan(userId)

  if (plan === 'pro') {
    return { allowed: true, plan }
  }

  // Check free tier usage
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('free_checks_used')
    .eq('id', userId)
    .single()

  const checksUsed = profile?.free_checks_used || 0
  const limit = PLANS.free.limits.checksPerMonth

  if (checksUsed >= limit) {
    return {
      allowed: false,
      reason: '無料プランの利用回数を超えました。Proプランにアップグレードしてください。',
      plan,
    }
  }

  return { allowed: true, plan }
}

/**
 * Increment free check count
 */
export async function incrementFreeCheckCount(userId: string): Promise<void> {
  const supabase = await createSupabaseClient()

  await supabase.rpc('increment_free_checks', { uid: userId })
}

/**
 * Get user's subscription details
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createSupabaseClient()

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

/**
 * Get user's profile with plan info
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createSupabaseClient()

  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return data
}
