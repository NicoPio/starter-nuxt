# Technical Research: Stripe Subscription Management

**Date**: 2025-12-08
**Feature**: 004-stripe-subscription-management
**Status**: Complete

## Executive Summary

Ce document présente les décisions techniques prises pour l'implémentation du système de gestion d'abonnements Stripe dans notre application Nuxt.js 4. Les recherches ont été effectuées sur la documentation officielle de Stripe, Nuxt.js 4, et les best practices de l'industrie.

**Décisions clés** :
- **Stripe SDK** : Pattern singleton pour le client serveur avec lazy loading
- **Checkout** : Stripe Checkout Session (hosted) plutôt que Payment Intents (custom UI)
- **Webhooks** : Validation de signature obligatoire + table d'idempotence
- **Chiffrement** : Clés API chiffrées AES-256 avec clé d'environnement
- **Architecture** : Server routes Nuxt avec composables Vue 3 Composition API

---

## 1. Stripe SDK Integration in Nuxt.js SSR

### Recherche Effectuée

Documentation consultée :
- [Stripe Node.js SDK Documentation](https://github.com/stripe/stripe-node)
- [Set up your development environment](https://docs.stripe.com/get-started/development-environment?lang=node)

### Décision : Pattern Singleton avec Lazy Loading

**Rationale** :
- Le client Stripe est thread-safe et peut être réutilisé entre requêtes
- Initialisation au premier appel pour éviter erreurs si clés non configurées au démarrage
- Configuration centralisée facilite le changement de clés par l'admin

**Implementation** :

```typescript
// server/utils/stripe/client.ts
import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripeClient(apiKey?: string): Stripe {
  const key = apiKey || useRuntimeConfig().stripe.secretKey

  if (!key) {
    throw createError({
      statusCode: 500,
      message: 'Stripe API key not configured',
    })
  }

  // Réutiliser l'instance existante si la clé est identique
  if (stripeInstance) {
    return stripeInstance
  }

  stripeInstance = new Stripe(key, {
    apiVersion: '2024-12-16.acacia',
    maxNetworkRetries: 2,
    timeout: 30000,
    telemetry: true,
  })

  return stripeInstance
}

export function resetStripeClient(): void {
  stripeInstance = null
}
```

**Alternatives considérées** :
1. **Nouvelle instance à chaque requête** : ❌ Overhead inutile, connexions multiples
2. **Global singleton initialisé au démarrage** : ❌ Échoue si clés non configurées
3. **Pattern usuel choisi** : ✅ Lazy loading + réutilisation d'instance

**Configuration Nuxt** :

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  },
})
```

---

## 2. Webhook Security & Idempotency

### Recherche Effectuée

Documentation consultée :
- [Webhook Signature Verification](https://docs.stripe.com/webhooks/signatures)
- [Idempotent Requests](https://docs.stripe.com/api/idempotent_requests?lang=node)
- [Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency)

### Décision : Validation de Signature + Table d'Idempotence

**Rationale** :
- **Sécurité** : Validation de signature empêche attaques par injection de faux webhooks
- **Fiabilité** : Stripe peut envoyer le même événement plusieurs fois (network retry)
- **Cohérence** : Table `webhook_logs` avec contrainte UNIQUE sur `stripe_event_id`

**Implementation de Validation** :

```typescript
// server/api/webhooks/stripe.post.ts
export default defineEventHandler(async (event) => {
  const stripe = getStripeClient()
  const config = useRuntimeConfig()

  // CRITICAL: Raw body requis par Stripe
  const rawBody = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!rawBody || !signature) {
    throw createError({
      statusCode: 400,
      message: 'Invalid webhook request',
    })
  }

  let stripeEvent: Stripe.Event

  try {
    // Vérification de signature avec le webhook secret
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.stripe.webhookSecret
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw createError({
      statusCode: 400,
      message: `Webhook signature verification failed: ${error.message}`,
    })
  }

  // Traitement de l'événement validé
  return await handleWebhookEvent(stripeEvent)
})
```

**Stratégie d'Idempotence** :

```typescript
async function handleWebhookEvent(event: Stripe.Event) {
  const db = await getDatabase()

  // Vérifier si événement déjà traité
  const existing = await db
    .selectFrom('webhook_logs')
    .where('stripe_event_id', '=', event.id)
    .selectAll()
    .executeTakeFirst()

  if (existing) {
    console.log(`Webhook ${event.id} already processed, skipping`)
    return { success: true } // Retourner 200 OK immédiatement
  }

  // Traiter l'événement
  try {
    await processEvent(event)

    // Enregistrer comme traité
    await db
      .insertInto('webhook_logs')
      .values({
        stripe_event_id: event.id,
        type: event.type,
        data: JSON.stringify(event.data),
        status: 'success',
        processed_at: new Date(),
      })
      .execute()
  } catch (error) {
    console.error(`Failed to process webhook ${event.id}:`, error)

    // Enregistrer l'échec pour investigation
    await db
      .insertInto('webhook_logs')
      .values({
        stripe_event_id: event.id,
        type: event.type,
        data: JSON.stringify(event.data),
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        processed_at: new Date(),
      })
      .execute()

    // Retourner 500 pour que Stripe retry
    throw createError({
      statusCode: 500,
      message: 'Webhook processing failed',
    })
  }

  return { success: true }
}
```

**Schema PostgreSQL** :

```sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE, -- Clé d'idempotence
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  status TEXT NOT NULL, -- 'success' | 'failed'
  error_message TEXT,
  processed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_event_id ON webhook_logs(stripe_event_id);
CREATE INDEX idx_webhook_logs_type ON webhook_logs(type);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
```

**Alternatives considérées** :
1. **Pas d'idempotence** : ❌ Risque de doublons (créer 2 abonnements pour même paiement)
2. **Cache en mémoire uniquement** : ❌ Perdu au redémarrage serveur
3. **Table DB avec UNIQUE constraint** : ✅ Persiste, garantit unicité au niveau DB

---

## 3. Stripe Checkout vs Payment Intents

### Recherche Effectuée

Documentation consultée :
- [Compare Checkout Sessions and Payment Intents](https://docs.stripe.com/payments/checkout-sessions-and-payment-intents-comparison)
- [Stripe Checkout Documentation](https://docs.stripe.com/payments/checkout)

### Décision : Stripe Checkout Session (Hosted Page)

**Rationale** :
- **Simplicité** : Page Stripe hosted complète (formulaire, 3DS, sauvegarde carte)
- **Sécurité PCI DSS** : Pas de gestion directe des cartes bancaires (compliance automatique)
- **Support abonnements natif** : Mode `subscription` intégré avec gestion récurrente
- **Maintenance** : Stripe gère les mises à jour UI, conformité, nouvelles méthodes de paiement
- **Délai d'implémentation** : ~50 lignes de code vs 200+ pour Payment Intents

**Comparaison Détaillée** :

| Critère | Checkout Session | Payment Intent |
|---------|------------------|----------------|
| **Complexité d'intégration** | ⭐ Minimale | ⭐⭐⭐ Élevée |
| **Interface de paiement** | Stripe-hosted (complète) | Custom (vous gérez) |
| **Abonnements** | ✅ Support natif | ❌ Nécessite Subscriptions API séparée |
| **Sauvegarde Payment Method** | ✅ Automatique | ❌ Manuel |
| **Maintenance** | ⭐ Faible | ⭐⭐⭐ Élevée |
| **Customisation UI** | ⭐⭐ Limitée | ⭐⭐⭐⭐⭐ Complète |
| **PCI Compliance** | ✅ Complète | ⚠️ À votre charge |
| **Cas d'usage** | SaaS, abonnements simples | Flux paiement ultra-custom |

**Implementation Checkout Session** :

```typescript
// server/api/subscriptions/checkout.post.ts
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { priceId, successUrl, cancelUrl } = await readBody(event)

  const stripe = getStripeClient()

  // Créer ou récupérer le customer Stripe
  let customerId = user.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create(
      {
        email: user.email,
        metadata: { userId: user.id },
      },
      {
        idempotencyKey: `customer_${user.id}`,
      }
    )

    customerId = customer.id

    // Sauvegarder l'ID customer
    await db
      .updateTable('users')
      .set({ stripe_customer_id: customerId })
      .where('id', '=', user.id)
      .execute()
  }

  // Créer la session de checkout
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription', // Mode abonnement (crucial!)
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  return {
    sessionId: session.id,
    url: session.url, // URL de redirection vers Stripe
  }
})
```

**Alternatives considérées** :
1. **Payment Intents** : ❌ Trop complexe pour notre cas d'usage abonnements simples
2. **Checkout Session** : ✅ Parfait pour SaaS avec abonnements récurrents
3. **Hybrid** : ❌ Complexité inutile pour une v1

---

## 4. Database Encryption for API Keys

### Recherche Effectuée

Documentation consultée :
- [PostgreSQL Encryption Options](https://www.postgresql.org/docs/current/encryption-options.html)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)

### Décision : Chiffrement AES-256 avec Clé d'Environnement

**Rationale** :
- **Sécurité** : Clés Stripe ne doivent jamais être en clair dans la base
- **Flexibilité** : Admin peut changer les clés via l'interface web
- **Backup sécurisé** : Backups DB ne contiennent pas de clés en clair
- **Rotation** : Clé de chiffrement peut être rotée indépendamment

**Implementation** :

```typescript
// server/utils/stripe/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const TAG_POSITION = SALT_LENGTH + IV_LENGTH
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

function getEncryptionKey(): Buffer {
  const key = process.env.STRIPE_ENCRYPTION_KEY

  if (!key) {
    throw new Error('STRIPE_ENCRYPTION_KEY environment variable not set')
  }

  // La clé doit faire 32 bytes pour AES-256
  if (key.length !== 64) {
    throw new Error('STRIPE_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }

  return Buffer.from(key, 'hex')
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const salt = randomBytes(SALT_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  const tag = cipher.getAuthTag()

  // Format: salt + iv + tag + encrypted
  const result = Buffer.concat([salt, iv, tag, encrypted])

  return result.toString('hex')
}

export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey()
  const stringValue = Buffer.from(ciphertext, 'hex')

  const salt = stringValue.subarray(0, SALT_LENGTH)
  const iv = stringValue.subarray(SALT_LENGTH, TAG_POSITION)
  const tag = stringValue.subarray(TAG_POSITION, ENCRYPTED_POSITION)
  const encrypted = stringValue.subarray(ENCRYPTED_POSITION)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

export function generateEncryptionKey(): string {
  // Générer une clé aléatoire de 32 bytes (256 bits)
  return randomBytes(32).toString('hex')
}
```

**Génération de clé (à exécuter une seule fois)** :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Configuration `.env`** :

```bash
# Clé de chiffrement AES-256 (64 hex chars = 32 bytes)
STRIPE_ENCRYPTION_KEY=a1b2c3d4e5f6...64_hex_chars_total
```

**Utilisation** :

```typescript
// server/api/admin/stripe/config.post.ts
import { encryptApiKey } from '~/server/utils/stripe/crypto'

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['Admin'])

  const { secretKey, publishableKey } = await readBody(event)

  // Chiffrer avant stockage
  const encryptedSecretKey = encryptApiKey(secretKey)
  const encryptedPublishableKey = encryptApiKey(publishableKey)

  await db
    .insertInto('stripe_configuration')
    .values({
      secret_key: encryptedSecretKey,
      publishable_key: encryptedPublishableKey,
      mode: secretKey.startsWith('sk_live_') ? 'production' : 'test',
      updated_at: new Date(),
    })
    .execute()

  return { success: true }
})

// server/utils/stripe/config.ts
import { decryptApiKey } from './crypto'

export async function getStripeConfig() {
  const config = await db
    .selectFrom('stripe_configuration')
    .selectAll()
    .orderBy('updated_at', 'desc')
    .limit(1)
    .executeTakeFirst()

  if (!config) {
    throw new Error('Stripe not configured')
  }

  return {
    secretKey: decryptApiKey(config.secret_key),
    publishableKey: decryptApiKey(config.publishable_key),
    mode: config.mode,
  }
}
```

**Alternatives considérées** :
1. **Clés en clair dans DB** : ❌ Risque sécurité (backups, logs, accès direct DB)
2. **Variables d'environnement uniquement** : ❌ Admin ne peut pas changer via UI
3. **Chiffrement AES-256 avec clé env** : ✅ Équilibre sécurité + flexibilité
4. **HashiCorp Vault** : ⚠️ Over-engineering pour une v1

---

## 5. Synchronization Strategy

### Recherche Effectuée

Documentation consultée :
- [Stripe Webhooks Best Practices](https://docs.stripe.com/webhooks/best-practices)
- [Stripe API Events](https://docs.stripe.com/api/events)

### Décision : Webhooks as Source of Truth

**Rationale** :
- **Temps réel** : Webhooks notifient immédiatement les changements (paiement réussi, annulation)
- **Fiabilité** : Stripe garantit la livraison avec retries exponentiels
- **Consistance** : Les webhooks sont la seule source de vérité sur l'état réel chez Stripe
- **Scalabilité** : Pas de polling récurrent qui charge l'API Stripe

**Événements Webhook Supportés** :

```typescript
// Événements critiques pour abonnements
const SUPPORTED_EVENTS = {
  // Abonnements
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,

  // Paiements
  'invoice.payment_succeeded': handlePaymentSucceeded,
  'invoice.payment_failed': handlePaymentFailed,

  // Remboursements
  'charge.refunded': handleRefund,

  // Méthodes de paiement
  'payment_method.attached': handlePaymentMethodAttached,
  'payment_method.detached': handlePaymentMethodDetached,
}
```

**Gestion des États Transitoires** :

```typescript
// server/utils/stripe/webhooks.ts
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const db = await getDatabase()

  const status = mapStripeStatus(subscription.status)

  await db
    .updateTable('user_subscriptions')
    .set({
      status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date(),
    })
    .where('stripe_subscription_id', '=', subscription.id)
    .execute()

  // Si abonnement annulé, désactiver features premium à la fin de période
  if (subscription.cancel_at_period_end) {
    await scheduleFeatureDisabling(
      subscription.id,
      new Date(subscription.current_period_end * 1000)
    )
  }
}

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'unpaid':
      return 'unpaid'
    case 'canceled':
      return 'cancelled'
    case 'incomplete':
      return 'incomplete'
    case 'incomplete_expired':
      return 'expired'
    case 'trialing':
      return 'trialing'
    case 'paused':
      return 'paused'
    default:
      return 'unknown'
  }
}
```

**Polling de Secours (Optionnel)** :

Pour les cas où les webhooks ne sont pas livrés (maintenance Stripe rare) :

```typescript
// server/tasks/sync-subscriptions.ts
// À exécuter via cron job toutes les 6 heures
export async function syncAllSubscriptions() {
  const stripe = getStripeClient()
  const db = await getDatabase()

  const subscriptions = await db
    .selectFrom('user_subscriptions')
    .where('status', 'in', ['active', 'trialing', 'past_due'])
    .selectAll()
    .execute()

  for (const sub of subscriptions) {
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        sub.stripe_subscription_id
      )

      // Comparer et mettre à jour si différent
      const localStatus = sub.status
      const remoteStatus = mapStripeStatus(stripeSubscription.status)

      if (localStatus !== remoteStatus) {
        console.warn(
          `Subscription ${sub.id} out of sync: local=${localStatus}, remote=${remoteStatus}`
        )

        await handleSubscriptionUpdated(stripeSubscription)
      }
    } catch (error) {
      console.error(`Failed to sync subscription ${sub.id}:`, error)
    }
  }
}
```

**Alternatives considérées** :
1. **Polling uniquement** : ❌ Latence, charge API, pas temps réel
2. **Webhooks uniquement** : ✅ Temps réel, fiable, recommandé par Stripe
3. **Hybrid webhooks + polling** : ⚠️ Utile pour fallback mais complexe à maintenir

---

## 6. Stripe Customer Portal Integration

### Recherche Effectuée

Documentation consultée :
- [Stripe Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal)
- [Customer Portal Configuration](https://docs.stripe.com/customer-management/customer-portal-settings)

### Décision : Utiliser le Customer Portal pour Gestion de Cartes

**Rationale** :
- **Conformité PCI** : Pas de formulaire de carte côté application
- **Fonctionnalités complètes** : Gestion carte, historique factures, annulation (configurable)
- **Maintenance zéro** : Stripe maintient l'UI et la sécurité
- **Expérience utilisateur** : UI cohérente avec Checkout

**Implementation** :

```typescript
// server/api/subscriptions/portal.post.ts
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { returnUrl } = await readBody(event)

  if (!user.stripe_customer_id) {
    throw createError({
      statusCode: 400,
      message: 'No active subscription found',
    })
  }

  const stripe = getStripeClient()

  // Créer une session portal
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: returnUrl,
  })

  return {
    url: session.url,
  }
})
```

**Configuration depuis Dashboard Stripe** :

1. Aller dans **Settings > Billing > Customer portal**
2. Activer les fonctionnalités :
   - ✅ Mettre à jour la méthode de paiement
   - ✅ Voir l'historique des factures
   - ✅ Annuler l'abonnement (optionnel, avec ou sans feedback)
   - ❌ Changer de plan (désactiver pour contrôler côté app)
3. Configurer les textes et branding

**Alternatives considérées** :
1. **Formulaire custom Stripe Elements** : ❌ Complexité, maintenance, PCI compliance
2. **Customer Portal Stripe** : ✅ Zéro maintenance, secure, complet
3. **API directe pour update payment method** : ❌ Nécessite Elements.js + PCI SAQ

---

## 7. Multi-Currency Support

### Recherche Effectuée

Documentation consultée :
- [Stripe Multi-Currency](https://docs.stripe.com/currencies)
- [Prices and Products](https://docs.stripe.com/products-prices/pricing-models)

### Décision : Devise Unique (EUR) en v1, Extensible Plus Tard

**Rationale** :
- **Simplicité v1** : Une devise (EUR) réduit complexité initiale
- **Stripe Requirement** : Un Price = une devise fixe
- **Extensibilité** : Architecture permet d'ajouter des devises plus tard (plusieurs Prices par Product)

**Architecture Extensible** :

```sql
-- Table subscription_plans
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stripe_product_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  amount INTEGER NOT NULL, -- En centimes
  currency TEXT NOT NULL DEFAULT 'eur',
  interval TEXT NOT NULL, -- 'month' | 'year'
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_plans_currency ON subscription_plans(currency);
```

**Évolution Future (Multi-Devises)** :

```typescript
// v2: Créer des Prices multiples pour un même Product
const product = await stripe.products.create({
  name: 'Pro Plan',
  description: 'Plan professionnel',
})

// Prix en EUR
await stripe.prices.create({
  product: product.id,
  unit_amount: 2900, // 29.00 EUR
  currency: 'eur',
  recurring: { interval: 'month' },
})

// Prix en USD
await stripe.prices.create({
  product: product.id,
  unit_amount: 3200, // $32.00 USD
  currency: 'usd',
  recurring: { interval: 'month' },
})

// Prix en GBP
await stripe.prices.create({
  product: product.id,
  unit_amount: 2600, // £26.00 GBP
  currency: 'gbp',
  recurring: { interval: 'month' },
})
```

**Alternatives considérées** :
1. **Multi-devises dès v1** : ❌ Over-engineering, complexité UI, conversion à gérer
2. **Devise unique EUR en v1** : ✅ Simple, rapide à implémenter, extensible
3. **Devise auto-détectée par IP** : ⚠️ Complexe, nécessite GeoIP + logic métier

---

## 8. Testing Strategy avec Stripe

### Recherche Effectuée

Documentation consultée :
- [Stripe Testing](https://docs.stripe.com/testing)
- [Stripe CLI](https://docs.stripe.com/stripe-cli)

### Décision : Stripe Test Mode + Stripe CLI + Fixtures

**Rationale** :
- **Stripe Test Mode** : Environnement isolé sans vrais paiements
- **Cartes de test** : Simulent tous les cas (succès, échec, 3DS, etc.)
- **Stripe CLI** : Forward webhooks vers localhost pour tests locaux
- **Fixtures** : Données de test Stripe pour tests unitaires isolés

**Cartes de Test Stripe** :

```typescript
// test/fixtures/stripe-test-cards.ts
export const STRIPE_TEST_CARDS = {
  // Succès
  SUCCESS: '4242424242424242',
  SUCCESS_DEBIT: '4000056655665556',

  // Échecs
  DECLINED: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  LOST_CARD: '4000000000009987',
  STOLEN_CARD: '4000000000009979',

  // 3D Secure
  REQUIRES_3DS: '4000002500003155',
  REQUIRES_3DS_ALWAYS: '4000002760003184',

  // Autres scénarios
  EXPIRED_CARD: '4000000000000069',
  INCORRECT_CVC: '4000000000000127',
  PROCESSING_ERROR: '4000000000000119',
}
```

**Configuration Stripe CLI pour Webhooks Locaux** :

```bash
# Installation
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks vers localhost
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# Tester un webhook spécifique
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

**Test E2E avec Playwright** :

```typescript
// test/e2e/user-subscription-flow.spec.ts
import { test, expect } from '@playwright/test'
import { STRIPE_TEST_CARDS } from '../fixtures/stripe-test-cards'

test.describe('User Subscription Flow', () => {
  test('should complete checkout successfully', async ({ page }) => {
    // Se connecter
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Aller sur la page des plans
    await page.goto('/subscriptions')

    // Sélectionner un plan
    await page.click('button:has-text("S\'abonner au plan Pro")')

    // Redirection vers Stripe Checkout
    await expect(page).toHaveURL(/checkout\.stripe\.com/)

    // Remplir le formulaire Stripe (en mode test)
    await page.fill('[name="cardnumber"]', STRIPE_TEST_CARDS.SUCCESS)
    await page.fill('[name="exp-date"]', '1234') // 12/34
    await page.fill('[name="cvc"]', '123')
    await page.fill('[name="postal"]', '12345')

    // Soumettre
    await page.click('button:has-text("Subscribe")')

    // Vérifier redirection vers success page
    await expect(page).toHaveURL(/\/subscriptions\/success/)
    await expect(page.locator('h1')).toContainText('Merci pour votre abonnement')
  })

  test('should handle payment failure', async ({ page }) => {
    // ... login ...

    await page.goto('/subscriptions')
    await page.click('button:has-text("S\'abonner")')

    // Utiliser carte déclinée
    await page.fill('[name="cardnumber"]', STRIPE_TEST_CARDS.DECLINED)
    await page.fill('[name="exp-date"]', '1234')
    await page.fill('[name="cvc"]', '123')
    await page.fill('[name="postal"]', '12345')

    await page.click('button:has-text("Subscribe")')

    // Vérifier message d'erreur
    await expect(page.locator('.error')).toContainText(
      'Your card was declined'
    )
  })
})
```

**Tests Unitaires avec Fixtures** :

```typescript
// test/unit/server/utils/stripe/webhooks.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { handleWebhookEvent } from '~/server/utils/stripe/webhooks'
import type Stripe from 'stripe'

describe('Stripe Webhooks', () => {
  it('should handle subscription.created event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test_123',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          current_period_start: 1702000000,
          current_period_end: 1704592000,
        } as Stripe.Subscription,
      },
    } as Stripe.Event

    const dbMock = vi.fn()

    const result = await handleWebhookEvent(mockEvent)

    expect(result.success).toBe(true)
    expect(dbMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_subscriptions')
    )
  })

  it('should skip already processed webhooks', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_duplicate_123',
      type: 'customer.subscription.updated',
    } as Stripe.Event

    // Simuler webhook déjà traité
    vi.mocked(db.selectFrom).mockResolvedValue({
      stripe_event_id: 'evt_duplicate_123',
      processed_at: new Date(),
    })

    const result = await handleWebhookEvent(mockEvent)

    expect(result.success).toBe(true)
    // Vérifier qu'aucun traitement n'a été fait
    expect(db.insertInto).not.toHaveBeenCalled()
  })
})
```

**Configuration Test dans `.env.test`** :

```bash
# Clés Stripe test mode
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_test_XXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Alternatives considérées** :
1. **Tests en production** : ❌ Dangereux, coûteux
2. **Stripe Test Mode uniquement** : ⚠️ Pas de tests locaux de webhooks
3. **Test Mode + Stripe CLI** : ✅ Environnement complet, webhooks locaux
4. **Mocks complets** : ❌ Ne teste pas l'intégration réelle Stripe

---

## 9. Error Handling & Retry Logic

### Recherche Effectuée

Documentation consultée :
- [Stripe Error Codes](https://docs.stripe.com/error-codes)
- [Stripe Rate Limits](https://docs.stripe.com/rate-limits)

### Décision : Retry Exponentiel + Logging Structuré

**Rationale** :
- **Résilience** : Network errors temporaires ne doivent pas casser le flux
- **Rate Limits** : Respecter les limites Stripe avec backoff
- **Observabilité** : Logs structurés pour debugging et alerting

**Implementation Retry Logic** :

```typescript
// server/utils/stripe/retry.ts
import { sleep } from '~/server/utils/helpers'

interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

export async function retryStripeOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: unknown) {
      lastError = error

      // Ne pas retry sur certaines erreurs
      if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        // Erreur de paramètres, pas besoin de retry
        throw error
      }

      if (error instanceof Stripe.errors.StripeAuthenticationError) {
        // Clé API invalide, pas besoin de retry
        throw error
      }

      // Retry sur erreurs réseau et rate limits
      const isRetryable =
        error instanceof Stripe.errors.StripeConnectionError ||
        error instanceof Stripe.errors.StripeAPIError ||
        (error instanceof Stripe.errors.StripeRateLimitError &&
          attempt < maxRetries)

      if (!isRetryable || attempt === maxRetries) {
        throw error
      }

      // Calculer délai avec backoff exponentiel
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt),
        maxDelayMs
      )

      console.warn(
        `Stripe operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          attempt,
        }
      )

      await sleep(delay)
    }
  }

  throw lastError
}

// Utilisation
export async function createCheckoutSession(
  customerId: string,
  priceId: string
) {
  const stripe = getStripeClient()

  return await retryStripeOperation(
    async () => {
      return await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        // ...
      })
    },
    {
      maxRetries: 3,
      baseDelayMs: 1000,
    }
  )
}
```

**Gestion des Erreurs Stripe** :

```typescript
// server/utils/stripe/error-handler.ts
export function handleStripeError(error: unknown): never {
  if (error instanceof Stripe.errors.StripeCardError) {
    // Erreur liée à la carte (déclinée, insuffisante, etc.)
    throw createError({
      statusCode: 400,
      statusMessage: 'Card Error',
      data: {
        code: error.code,
        message: error.message,
        declineCode: error.decline_code,
      },
    })
  }

  if (error instanceof Stripe.errors.StripeRateLimitError) {
    // Trop de requêtes
    throw createError({
      statusCode: 429,
      statusMessage: 'Rate Limit Exceeded',
      data: {
        code: 'RATE_LIMIT',
        message: 'Too many requests to Stripe, please try again later',
      },
    })
  }

  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    // Paramètres invalides
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Request',
      data: {
        code: error.code,
        message: error.message,
        param: error.param,
      },
    })
  }

  if (error instanceof Stripe.errors.StripeAuthenticationError) {
    // Clé API invalide
    console.error('Stripe authentication failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe Configuration Error',
      data: {
        code: 'AUTH_ERROR',
        message: 'Stripe API authentication failed',
      },
    })
  }

  if (error instanceof Stripe.errors.StripeConnectionError) {
    // Problème réseau
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      data: {
        code: 'CONNECTION_ERROR',
        message: 'Failed to connect to Stripe',
      },
    })
  }

  // Erreur générique
  console.error('Unexpected Stripe error:', error)
  throw createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
    data: {
      code: 'STRIPE_ERROR',
      message: 'An unexpected error occurred with Stripe',
    },
  })
}
```

**Logging Structuré** :

```typescript
// server/utils/logger.ts
interface LogContext {
  userId?: string
  stripeCustomerId?: string
  subscriptionId?: string
  [key: string]: unknown
}

export function logStripeOperation(
  operation: string,
  context: LogContext,
  level: 'info' | 'warn' | 'error' = 'info'
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    operation,
    ...context,
  }

  if (level === 'error') {
    console.error('[Stripe]', JSON.stringify(logEntry))
  } else if (level === 'warn') {
    console.warn('[Stripe]', JSON.stringify(logEntry))
  } else {
    console.log('[Stripe]', JSON.stringify(logEntry))
  }
}

// Utilisation
logStripeOperation('checkout.created', {
  userId: user.id,
  stripeCustomerId: customerId,
  priceId,
  amount: 2900,
})

logStripeOperation('webhook.processed', {
  eventId: event.id,
  eventType: event.type,
  subscriptionId: subscription.id,
})

logStripeOperation('payment.failed', {
  userId: user.id,
  reason: 'card_declined',
  declineCode: 'insufficient_funds',
}, 'error')
```

**Alternatives considérées** :
1. **Pas de retry** : ❌ Erreurs temporaires cassent le flux
2. **Retry infini** : ❌ Peut bloquer indéfiniment
3. **Backoff exponentiel (3 retries)** : ✅ Standard industry, respecte Stripe
4. **Queue de retry asynchrone** : ⚠️ Over-engineering pour v1

---

## 10. Nuxt UI Components for Forms

### Recherche Effectuée

Documentation consultée :
- [Nuxt UI Documentation](https://ui.nuxt.com/)
- [Nuxt UI Forms](https://ui.nuxt.com/components/forms)

### Décision : UForm + Zod pour Tous les Formulaires

**Rationale** :
- **Cohérence** : Utilisation des composants Nuxt UI déjà présents dans le projet
- **Validation** : Intégration native avec Zod (déjà utilisé côté serveur)
- **Accessibilité** : Composants Nuxt UI respectent WCAG 2.1
- **Dark Mode** : Support automatique du dark mode

**Composants Utilisés** :

```typescript
// app/components/admin/stripe/ConfigurationForm.vue
<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const ConfigSchema = z.object({
  secretKey: z.string().startsWith('sk_').min(20),
  publishableKey: z.string().startsWith('pk_').min(20),
  webhookSecret: z.string().startsWith('whsec_').min(20),
})

type ConfigFormData = z.infer<typeof ConfigSchema>

const state = reactive<ConfigFormData>({
  secretKey: '',
  publishableKey: '',
  webhookSecret: '',
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<ConfigFormData>) {
  loading.value = true

  try {
    await $fetch('/api/admin/stripe/config', {
      method: 'POST',
      body: event.data,
    })

    useToast().add({
      title: 'Configuration sauvegardée',
      description: 'Les clés Stripe ont été mises à jour avec succès',
      color: 'green',
    })
  } catch (error) {
    useToast().add({
      title: 'Erreur',
      description: 'Impossible de sauvegarder la configuration',
      color: 'red',
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold">Configuration Stripe</h3>
    </template>

    <UForm
      :schema="ConfigSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormGroup
        label="Clé secrète"
        name="secretKey"
        help="Commence par sk_test_ ou sk_live_"
      >
        <UInput
          v-model="state.secretKey"
          type="password"
          placeholder="sk_test_..."
          icon="i-heroicons-key"
        />
      </UFormGroup>

      <UFormGroup
        label="Clé publique"
        name="publishableKey"
        help="Commence par pk_test_ ou pk_live_"
      >
        <UInput
          v-model="state.publishableKey"
          placeholder="pk_test_..."
          icon="i-heroicons-globe-alt"
        />
      </UFormGroup>

      <UFormGroup
        label="Webhook secret"
        name="webhookSecret"
        help="Commence par whsec_"
      >
        <UInput
          v-model="state.webhookSecret"
          type="password"
          placeholder="whsec_..."
          icon="i-heroicons-shield-check"
        />
      </UFormGroup>

      <div class="flex justify-end gap-3">
        <UButton
          type="submit"
          color="primary"
          :loading="loading"
          :disabled="loading"
        >
          Sauvegarder
        </UButton>
      </div>
    </UForm>
  </UCard>
</template>
```

**Composant Plan de Souscription** :

```vue
<!-- app/components/user/subscriptions/PlanSelector.vue -->
<script setup lang="ts">
interface Plan {
  id: string
  name: string
  description: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
}

const props = defineProps<{
  plans: Plan[]
}>()

const loading = ref<string | null>(null)

async function subscribe(plan: Plan) {
  loading.value = plan.id

  try {
    const { url } = await $fetch('/api/subscriptions/checkout', {
      method: 'POST',
      body: {
        priceId: plan.id,
        successUrl: `${window.location.origin}/subscriptions/success`,
        cancelUrl: `${window.location.origin}/subscriptions`,
      },
    })

    // Rediriger vers Stripe Checkout
    window.location.href = url
  } catch (error) {
    useToast().add({
      title: 'Erreur',
      description: 'Impossible de créer la session de paiement',
      color: 'red',
    })
    loading.value = null
  }
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <UCard
      v-for="plan in plans"
      :key="plan.id"
      class="flex flex-col"
    >
      <template #header>
        <div class="text-center">
          <h3 class="text-xl font-bold">{{ plan.name }}</h3>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            {{ plan.description }}
          </p>
        </div>
      </template>

      <div class="flex-1 space-y-4">
        <div class="text-center">
          <p class="text-4xl font-bold">
            {{ formatPrice(plan.amount, plan.currency) }}
          </p>
          <p class="text-gray-600 dark:text-gray-400">
            / {{ plan.interval === 'month' ? 'mois' : 'an' }}
          </p>
        </div>

        <ul class="space-y-2">
          <li
            v-for="feature in plan.features"
            :key="feature"
            class="flex items-center gap-2"
          >
            <UIcon name="i-heroicons-check-circle" class="text-green-500" />
            <span>{{ feature }}</span>
          </li>
        </ul>
      </div>

      <template #footer>
        <UButton
          block
          color="primary"
          size="lg"
          :loading="loading === plan.id"
          :disabled="loading !== null"
          @click="subscribe(plan)"
        >
          S'abonner
        </UButton>
      </template>
    </UCard>
  </div>
</template>
```

**Alternatives considérées** :
1. **Formulaires HTML natifs** : ❌ Pas de validation client, pas de cohérence UI
2. **Librairie tierce (Formkit, VeeValidate)** : ❌ Déjà Nuxt UI dans le projet
3. **Nuxt UI Forms + Zod** : ✅ Cohérence, validation, accessibilité

---

## Summary of Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| **Stripe Client** | Singleton lazy loading | Réutilisation instance, gestion clés dynamiques |
| **Cache Config** | Cache 1h + fallback env | Équilibre performance/flexibilité |
| **Checkout** | Checkout Session (hosted) | Simplicité, PCI compliant, maintenance zéro |
| **Webhooks** | Signature validation + idempotence table | Sécurité + fiabilité (retries Stripe) |
| **Encryption** | AES-256 avec clé env | Sécurité backups + admin peut changer clés |
| **Sync** | Webhooks as source of truth | Temps réel, recommandé par Stripe |
| **Customer Portal** | Stripe-hosted portal | PCI compliant, zéro maintenance |
| **Currency** | EUR uniquement en v1 | Simplicité, extensible plus tard |
| **Testing** | Test mode + Stripe CLI + fixtures | Environnement complet, webhooks locaux |
| **Retry** | Backoff exponentiel (3 retries) | Résilience network errors, respecte rate limits |
| **UI** | Nuxt UI + Zod validation | Cohérence projet existant, accessibilité |

---

## Implementation Readiness

✅ **Tous les points de recherche sont résolus**

- Architecture technique définie
- Patterns de code documentés
- Sécurité validée (chiffrement, webhooks)
- Tests planifiés (E2E, unit, fixtures)
- Composants UI sélectionnés

**Prochaines étapes** :
1. ✅ Phase 0 Complete : research.md (ce fichier)
2. ⏭️ Phase 1 : Créer data-model.md, contracts/, quickstart.md
3. ⏭️ Phase 2 : Générer tasks.md pour implémentation

---

## References

- [Stripe Node.js SDK](https://github.com/stripe/stripe-node)
- [Stripe Documentation](https://docs.stripe.com/)
- [Nuxt.js 4 Documentation](https://nuxt.com/docs/4.x)
- [Nuxt UI Documentation](https://ui.nuxt.com/)
- [Better Auth Documentation](https://www.better-auth.com/)
- [Zod Validation](https://zod.dev/)
