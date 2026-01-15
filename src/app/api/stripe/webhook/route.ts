import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(supabase, session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(supabase, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(supabase, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id
  const type = session.metadata?.type

  if (!userId) {
    console.error('No user_id in checkout session metadata')
    return
  }

  if (type === 'subscription') {
    // Subscription is handled by customer.subscription.created event
    console.log(`Subscription checkout completed for user ${userId}`)

    // Update user plan to pro
    await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        plan: 'pro',
      })

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_org_id: null,
      p_action_type: 'subscription.started',
      p_target_type: 'subscription',
      p_target_id: null,
      p_metadata: { session_id: session.id },
    })
  } else if (type === 'human_review') {
    const reviewRequestId = session.metadata?.review_request_id

    if (reviewRequestId) {
      // Update human review request payment status
      await supabase
        .from('human_review_requests')
        .update({
          payment_status: 'paid',
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', reviewRequestId)

      console.log(`Human review payment completed for request ${reviewRequestId}`)
    }
  }
}

async function handleSubscriptionChange(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  // Get user_id from customer
  const customer = await stripe.customers.retrieve(subscription.customer as string)
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id

  if (!userId) {
    console.error('No supabase_user_id in customer metadata')
    return
  }

  const status = subscription.status === 'active' ? 'active' :
                 subscription.status === 'past_due' ? 'past_due' :
                 subscription.status === 'canceled' ? 'canceled' : 'inactive'

  // Upsert subscription record
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0]?.price.id,
      status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }, {
      onConflict: 'stripe_subscription_id',
    })

  // Update user plan
  await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      plan: status === 'active' ? 'pro' : 'free',
    })

  console.log(`Subscription ${subscription.id} updated for user ${userId}: ${status}`)
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const customer = await stripe.customers.retrieve(subscription.customer as string)
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id

  if (!userId) {
    console.error('No supabase_user_id in customer metadata')
    return
  }

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
    })
    .eq('stripe_subscription_id', subscription.id)

  // Downgrade user plan
  await supabase
    .from('user_profiles')
    .update({
      plan: 'free',
    })
    .eq('id', userId)

  // Log activity
  await supabase.rpc('log_activity', {
    p_user_id: userId,
    p_org_id: null,
    p_action_type: 'subscription.canceled',
    p_target_type: 'subscription',
    p_target_id: null,
    p_metadata: { subscription_id: subscription.id },
  })

  console.log(`Subscription deleted for user ${userId}`)
}

async function handleInvoicePaymentSucceeded(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  console.log(`Invoice payment succeeded: ${invoice.id}`)
}

async function handleInvoicePaymentFailed(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  const customer = await stripe.customers.retrieve(invoice.customer as string)
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id

  if (userId) {
    // Update subscription status to past_due
    await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
      })
      .eq('user_id', userId)
      .eq('status', 'active')

    console.log(`Invoice payment failed for user ${userId}`)
  }
}
