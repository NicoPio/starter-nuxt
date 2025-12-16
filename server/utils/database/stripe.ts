import { getUsersDatabase } from '../database'
import type { SubscriptionPlan, UserSubscription, PaymentHistory, WebhookLog, StripeConfiguration } from '~/types/stripe.types'

interface DatabaseAdapter {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

/**
 * Récupère l'instance de base de données PostgreSQL depuis le module database
 */
export function getDatabase(): DatabaseAdapter {
  return getUsersDatabase()
}

// =====================================================
// Stripe Configuration Queries
// =====================================================

export async function getActiveStripeConfig(): Promise<StripeConfiguration | null> {
  const db = getDatabase()

  const result = await db.query(
    'SELECT * FROM stripe_configuration WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1',
    []
  )

  return result.rows[0] ? (result.rows[0] as unknown as StripeConfiguration) : null
}

export async function saveStripeConfiguration(
  secretKey: string,
  publishableKey: string,
  webhookSecret: string,
  mode: 'test' | 'production'
): Promise<void> {
  const db = getDatabase()

  // Désactiver toutes les configs existantes
  await db.query('UPDATE stripe_configuration SET is_active = FALSE', [])

  // Insérer la nouvelle config
  await db.query(
    `INSERT INTO stripe_configuration (secret_key, publishable_key, webhook_secret, mode, is_active)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [secretKey, publishableKey, webhookSecret, mode]
  )
}

// =====================================================
// Subscription Plans Queries
// =====================================================

export async function getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const db = getDatabase()

  const result = await db.query(
    'SELECT * FROM subscription_plans WHERE active = TRUE ORDER BY display_order ASC, created_at ASC',
    []
  )

  return result.rows as unknown as SubscriptionPlan[]
}

export async function getSubscriptionPlanById(id: string): Promise<SubscriptionPlan | null> {
  const db = getDatabase()

  const result = await db.query(
    'SELECT * FROM subscription_plans WHERE id = $1',
    [id]
  )

  return result.rows[0] ? (result.rows[0] as unknown as SubscriptionPlan) : null
}

export async function getSubscriptionPlanByStripeId(stripePriceId: string): Promise<SubscriptionPlan | null> {
  const db = getDatabase()

  const result = await db.query(
    'SELECT * FROM subscription_plans WHERE stripe_price_id = $1',
    [stripePriceId]
  )

  return result.rows[0] ? (result.rows[0] as unknown as SubscriptionPlan) : null
}

export async function createSubscriptionPlan(plan: {
  name: string
  description?: string
  stripeProductId: string
  stripePriceId: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount?: number
  features?: string[]
  displayOrder?: number
}): Promise<SubscriptionPlan> {
  const db = getDatabase()

  const result = await db.query(
    `INSERT INTO subscription_plans
     (name, description, stripe_product_id, stripe_price_id, amount, currency, interval, interval_count, features, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
     RETURNING *`,
    [
      plan.name,
      plan.description || null,
      plan.stripeProductId,
      plan.stripePriceId,
      plan.amount,
      plan.currency,
      plan.interval,
      plan.intervalCount || 1,
      JSON.stringify(plan.features || []),
      plan.displayOrder || 0,
    ]
  )

  return result.rows[0] as unknown as SubscriptionPlan
}

// =====================================================
// User Subscriptions Queries
// =====================================================

export async function getUserActiveSubscription(userId: string): Promise<UserSubscription | null> {
  const db = getDatabase()

  const result = await db.query(
    `SELECT us.*, sp.name as plan_name, sp.amount as plan_amount, sp.currency as plan_currency
     FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = $1 AND us.status IN ('active', 'trialing', 'past_due')
     ORDER BY us.created_at DESC
     LIMIT 1`,
    [userId]
  )

  return result.rows[0] ? (result.rows[0] as unknown as UserSubscription) : null
}

export async function getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | null> {
  const db = getDatabase()

  const result = await db.query(
    'SELECT * FROM user_subscriptions WHERE stripe_subscription_id = $1',
    [stripeSubscriptionId]
  )

  return result.rows[0] ? (result.rows[0] as unknown as UserSubscription) : null
}

export async function createUserSubscription(subscription: {
  userId: string
  planId: string
  stripeSubscriptionId: string
  stripeCustomerId: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd?: boolean
}): Promise<UserSubscription> {
  const db = getDatabase()

  const result = await db.query(
    `INSERT INTO user_subscriptions
     (user_id, plan_id, stripe_subscription_id, stripe_customer_id, status, current_period_start, current_period_end, cancel_at_period_end)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      subscription.userId,
      subscription.planId,
      subscription.stripeSubscriptionId,
      subscription.stripeCustomerId,
      subscription.status,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
      subscription.cancelAtPeriodEnd || false,
    ]
  )

  return result.rows[0] as unknown as UserSubscription
}

export async function updateUserSubscription(
  stripeSubscriptionId: string,
  updates: {
    status?: string
    currentPeriodStart?: Date
    currentPeriodEnd?: Date
    cancelAtPeriodEnd?: boolean
    cancelledAt?: Date
  }
): Promise<void> {
  const db = getDatabase()

  const setClauses: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`)
    params.push(updates.status)
  }

  if (updates.currentPeriodStart !== undefined) {
    setClauses.push(`current_period_start = $${paramIndex++}`)
    params.push(updates.currentPeriodStart)
  }

  if (updates.currentPeriodEnd !== undefined) {
    setClauses.push(`current_period_end = $${paramIndex++}`)
    params.push(updates.currentPeriodEnd)
  }

  if (updates.cancelAtPeriodEnd !== undefined) {
    setClauses.push(`cancel_at_period_end = $${paramIndex++}`)
    params.push(updates.cancelAtPeriodEnd)
  }

  if (updates.cancelledAt !== undefined) {
    setClauses.push(`cancelled_at = $${paramIndex++}`)
    params.push(updates.cancelledAt)
  }

  if (setClauses.length === 0) return

  setClauses.push(`updated_at = NOW()`)
  params.push(stripeSubscriptionId)

  await db.query(
    `UPDATE user_subscriptions SET ${setClauses.join(', ')} WHERE stripe_subscription_id = $${paramIndex}`,
    params
  )
}

// =====================================================
// Payment History Queries
// =====================================================

export async function getUserPaymentHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<PaymentHistory[]> {
  const db = getDatabase()

  const result = await db.query(
    `SELECT * FROM payment_history
     WHERE user_id = $1
     ORDER BY paid_at DESC NULLS LAST, created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  )

  return result.rows as unknown as PaymentHistory[]
}

export async function createPaymentHistory(payment: {
  userId: string
  subscriptionId: string
  stripeInvoiceId: string
  stripePaymentIntentId?: string | null
  amount: number
  currency: string
  status: string
  invoicePdfUrl?: string | null
  paidAt?: Date | null
}): Promise<PaymentHistory> {
  const db = getDatabase()

  const result = await db.query(
    `INSERT INTO payment_history
     (user_id, subscription_id, stripe_invoice_id, stripe_payment_intent_id, amount, currency, status, invoice_pdf_url, paid_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      payment.userId,
      payment.subscriptionId,
      payment.stripeInvoiceId,
      payment.stripePaymentIntentId || null,
      payment.amount,
      payment.currency,
      payment.status,
      payment.invoicePdfUrl || null,
      payment.paidAt || null,
    ]
  )

  return result.rows[0] as unknown as PaymentHistory
}

// =====================================================
// Webhook Logs Queries
// =====================================================

export async function getWebhookLogByEventId(stripeEventId: string): Promise<WebhookLog | null> {
  const db = getDatabase()

  const result = await db.query(
    'SELECT * FROM webhook_logs WHERE stripe_event_id = $1',
    [stripeEventId]
  )

  return result.rows[0] ? (result.rows[0] as unknown as WebhookLog) : null
}

export async function createWebhookLog(log: {
  stripeEventId: string
  type: string
  data: unknown
  status: 'success' | 'failed'
  errorMessage?: string | null
  processedAt: Date
}): Promise<WebhookLog> {
  const db = getDatabase()

  const result = await db.query(
    `INSERT INTO webhook_logs
     (stripe_event_id, type, data, status, error_message, processed_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6)
     RETURNING *`,
    [
      log.stripeEventId,
      log.type,
      JSON.stringify(log.data),
      log.status,
      log.errorMessage || null,
      log.processedAt,
    ]
  )

  return result.rows[0] as unknown as WebhookLog
}

// =====================================================
// User Queries (stripe_customer_id)
// =====================================================

export async function getUserStripeCustomerId(userId: string): Promise<string | null> {
  const db = getDatabase()

  const result = await db.query(
    'SELECT stripe_customer_id FROM "user" WHERE id = $1',
    [userId]
  )

  return result.rows[0]?.stripe_customer_id as string | null || null
}

export async function setUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
  const db = getDatabase()

  await db.query(
    'UPDATE "user" SET stripe_customer_id = $1 WHERE id = $2',
    [stripeCustomerId, userId]
  )
}
