import Stripe from 'stripe'
import { auth } from '../../utils/auth'

interface DatabaseAdapter {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

// Lazy initialization de Stripe pour éviter les erreurs si la clé n'est pas configurée
let stripe: Stripe | null = null
const getStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-11-17.clover'
    })
  }
  return stripe
}

export default defineEventHandler(async (event) => {
  const stripeInstance = getStripe()
  if (!stripeInstance) {
    throw createError({
      statusCode: 500,
      message: 'Stripe is not configured',
    })
  }
  const body = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!body || !signature) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request',
    })
  }

  let stripeEvent: Stripe.Event

  try {
    stripeEvent = stripeInstance.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Webhook] Signature verification failed:', message)
    throw createError({
      statusCode: 400,
      message: `Webhook signature verification failed: ${message}`,
    })
  }

  const db = auth.options.database as DatabaseAdapter

  try {
    switch (stripeEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(db, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(db, subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice
        await handlePaymentFailed(db, invoice)
        break
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${stripeEvent.type}`)
    }

    return { received: true }
  } catch (error: unknown) {
    console.error('[Webhook] Error handling event:', error)
    throw createError({
      statusCode: 500,
      message: 'Webhook handler failed',
    })
  }
})

async function handleSubscriptionUpdate(db: DatabaseAdapter, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const subscriptionId = subscription.id

  let planType = 'free'
  if (subscription.items.data.length > 0) {
    const priceId = subscription.items.data[0]?.price?.id
    if (priceId) {
      planType = mapPriceIdToPlan(priceId)
    }
  }

  const status = mapStripeStatus(subscription.status)

  // Les propriétés current_period_start, current_period_end, cancel_at existent sur Stripe.Subscription
  const sub = subscription as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
    cancel_at?: number | null
  }

  const currentPeriodStart = sub.current_period_start || 0
  const currentPeriodEnd = sub.current_period_end || 0
  const cancelAt = sub.cancel_at || null

  await db.query(
    `UPDATE subscriptions
     SET
       stripe_subscription_id = $1,
       plan_type = $2,
       status = $3,
       current_period_start = to_timestamp($4),
       current_period_end = to_timestamp($5),
       cancel_at = CASE WHEN $6 IS NOT NULL THEN to_timestamp($6) ELSE NULL END,
       updated_at = NOW()
     WHERE stripe_customer_id = $7`,
    [
      subscriptionId,
      planType,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAt,
      customerId
    ]
  )

  console.log(`[Webhook] Subscription ${subscriptionId} updated for customer ${customerId}`)
}

async function handleSubscriptionDeleted(db: DatabaseAdapter, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const subscriptionId = subscription.id

  await db.query(
    `UPDATE subscriptions
     SET
       plan_type = 'free',
       status = 'expired',
       stripe_subscription_id = NULL,
       cancelled_at = NOW(),
       updated_at = NOW()
     WHERE stripe_customer_id = $1 AND stripe_subscription_id = $2`,
    [customerId, subscriptionId]
  )

  console.log(`[Webhook] Subscription ${subscriptionId} deleted for customer ${customerId}`)
}

async function handlePaymentFailed(db: DatabaseAdapter, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  // invoice.subscription existe sur Stripe.Invoice (string | Subscription | DeletedSubscription | null)
  const inv = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
  const sub = inv.subscription
  const subscriptionId = typeof sub === 'string' ? sub : (sub && typeof sub === 'object' && 'id' in sub ? sub.id : null)

  if (!subscriptionId) {
    console.log('[Webhook] No subscription ID in invoice, skipping')
    return
  }

  await db.query(
    `UPDATE subscriptions
     SET
       status = 'past_due',
       updated_at = NOW()
     WHERE stripe_customer_id = $1 AND stripe_subscription_id = $2`,
    [customerId, subscriptionId]
  )

  console.log(`[Webhook] Payment failed for subscription ${subscriptionId}`)
}

function mapPriceIdToPlan(priceId: string): string {
  if (priceId.includes('pro')) return 'pro'
  if (priceId.includes('enterprise')) return 'enterprise'
  return 'free'
}

function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'canceled':
      return 'cancelled'
    case 'past_due':
      return 'past_due'
    default:
      return 'expired'
  }
}
