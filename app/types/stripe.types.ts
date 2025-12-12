import type Stripe from 'stripe'

// =====================================================
// Subscription Plan Types
// =====================================================

export type SubscriptionInterval = 'month' | 'year'

export interface SubscriptionPlan {
  id: string
  name: string
  description: string | null
  stripe_product_id: string
  stripe_price_id: string
  amount: number // en centimes
  currency: string
  interval: SubscriptionInterval
  interval_count: number
  features: string[]
  active: boolean
  display_order: number
  created_at: Date
  updated_at: Date
}

// =====================================================
// User Subscription Types
// =====================================================

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'cancelled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'

export interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  status: SubscriptionStatus
  current_period_start: Date
  current_period_end: Date
  cancel_at_period_end: boolean
  cancelled_at: Date | null
  created_at: Date
  updated_at: Date
  // Relations
  plan?: SubscriptionPlan
}

// =====================================================
// Payment History Types
// =====================================================

export type PaymentStatus = 'paid' | 'open' | 'void' | 'uncollectible' | 'failed'

export interface PaymentHistory {
  id: string
  user_id: string
  subscription_id: string
  stripe_invoice_id: string
  stripe_payment_intent_id: string | null
  amount: number // en centimes
  currency: string
  status: PaymentStatus
  invoice_pdf_url: string | null
  paid_at: Date | null
  created_at: Date
  // Relations
  subscription?: UserSubscription
}

// =====================================================
// Stripe Configuration Types
// =====================================================

export type StripeMode = 'test' | 'production'

export interface StripeConfiguration {
  id: string
  secret_key: string // chiffré
  publishable_key: string // chiffré
  webhook_secret: string // chiffré
  mode: StripeMode
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// =====================================================
// Webhook Log Types
// =====================================================

export type WebhookStatus = 'success' | 'failed'

export interface WebhookLog {
  id: string
  stripe_event_id: string
  type: string
  data: unknown // JSONB
  status: WebhookStatus
  error_message: string | null
  processed_at: Date
  created_at: Date
}

// =====================================================
// API Request/Response Types
// =====================================================

// Configuration

export interface StripeConfigRequest {
  secretKey: string
  publishableKey: string
  webhookSecret: string
}

export interface StripeConfigResponse {
  mode: StripeMode
  publishableKey: string // masqué partiellement
  webhookSecret: string // masqué partiellement
  isActive: boolean
  updatedAt: string
}

export interface StripeTestConnectionResponse {
  success: boolean
  mode: StripeMode
  accountId?: string
  error?: string
}

// Subscription Plans

export interface CreatePlanRequest {
  name: string
  description?: string
  amount: number
  currency: string
  interval: SubscriptionInterval
  intervalCount?: number
  features?: string[]
}

export interface UpdatePlanRequest {
  name?: string
  description?: string
  active?: boolean
  features?: string[]
  displayOrder?: number
}

export interface PlanMetrics {
  plan_id: string
  subscriber_count: number
  mrr: number // Monthly Recurring Revenue
  active_subscriptions: number
}

// Checkout

export interface CreateCheckoutSessionRequest {
  priceId: string
  successUrl: string
  cancelUrl: string
}

export interface CreateCheckoutSessionResponse {
  sessionId: string
  url: string
}

// Subscription Management

export interface CancelSubscriptionRequest {
  subscriptionId: string
  cancelAtPeriodEnd?: boolean
}

export interface ReactivateSubscriptionRequest {
  subscriptionId: string
}

export interface CreatePortalSessionRequest {
  returnUrl: string
}

export interface CreatePortalSessionResponse {
  url: string
}

// Payment History

export interface PaymentHistoryQuery {
  limit?: number
  offset?: number
  status?: PaymentStatus
}

// =====================================================
// Stripe SDK Helper Types
// =====================================================

export type StripeCustomer = Stripe.Customer
export type StripeSubscription = Stripe.Subscription
export type StripeProduct = Stripe.Product
export type StripePrice = Stripe.Price
export type StripeInvoice = Stripe.Invoice
export type StripePaymentIntent = Stripe.PaymentIntent
export type StripeEvent = Stripe.Event
export type StripeCheckoutSession = Stripe.Checkout.Session

// =====================================================
// Webhook Event Types
// =====================================================

export type StripeWebhookEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'charge.refunded'
  | 'payment_method.attached'
  | 'payment_method.detached'

// =====================================================
// Utility Types
// =====================================================

export interface MaskedApiKey {
  prefix: string // ex: "sk_test"
  lastFour: string // ex: "1234"
  masked: string // ex: "sk_test_••••••••••••••••••••1234"
}

export interface SubscriptionPlanWithMetrics extends SubscriptionPlan {
  metrics: PlanMetrics
}
