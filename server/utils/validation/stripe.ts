import { z } from 'zod'

// =====================================================
// Stripe Configuration Validation
// =====================================================

export const StripeConfigSchema = z.object({
  secretKey: z.string().min(1, 'La clé secrète est requise').refine(
    (key) => key.startsWith('sk_test_') || key.startsWith('sk_live_'),
    'La clé secrète doit commencer par sk_test_ ou sk_live_'
  ),
  publishableKey: z.string().min(1, 'La clé publique est requise').refine(
    (key) => key.startsWith('pk_test_') || key.startsWith('pk_live_'),
    'La clé publique doit commencer par pk_test_ ou pk_live_'
  ),
  webhookSecret: z.string().min(1, 'Le secret webhook est requis').refine(
    (secret) => secret.startsWith('whsec_'),
    'Le secret webhook doit commencer par whsec_'
  ),
})

// =====================================================
// Subscription Plan Validation
// =====================================================

export const CreatePlanSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom est trop long'),
  description: z.string().max(500, 'La description est trop longue').optional(),
  amount: z.number().int('Le montant doit être un entier').min(0, 'Le montant doit être positif ou nul'),
  currency: z.string().length(3, 'La devise doit faire 3 caractères (ex: eur, usd)').toLowerCase(),
  interval: z.enum(['month', 'year'], {
    errorMap: () => ({ message: "L'intervalle doit être 'month' ou 'year'" }),
  }),
  intervalCount: z.number().int().min(1).max(12).optional().default(1),
  features: z.array(z.string()).optional().default([]),
})

export const UpdatePlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  displayOrder: z.number().int().min(0).optional(),
})

// =====================================================
// Checkout Validation
// =====================================================

export const CreateCheckoutSessionSchema = z.object({
  priceId: z.string().min(1, "L'ID du prix est requis").refine(
    (id) => id.startsWith('price_'),
    "L'ID du prix doit commencer par price_"
  ),
  successUrl: z.string().url('URL de succès invalide'),
  cancelUrl: z.string().url("URL d'annulation invalide"),
})

// =====================================================
// Subscription Management Validation
// =====================================================

export const CancelSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid("L'ID de l'abonnement doit être un UUID valide"),
  cancelAtPeriodEnd: z.boolean().optional().default(true),
})

export const ReactivateSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid("L'ID de l'abonnement doit être un UUID valide"),
})

// =====================================================
// Payment History Validation
// =====================================================

export const PaymentHistoryQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  status: z.enum(['paid', 'open', 'void', 'uncollectible', 'failed']).optional(),
})

// =====================================================
// Webhook Validation
// =====================================================

export const StripeWebhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.object({
    object: z.unknown(),
  }),
  created: z.number(),
})
