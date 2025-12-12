# Data Model: Stripe Subscription Management

**Feature**: 004-stripe-subscription-management
**Date**: 2025-12-08
**Database**: PostgreSQL (Supabase self-hosted)

## Overview

Ce document définit le schéma de base de données pour la gestion des abonnements Stripe. Le modèle de données est conçu pour synchroniser les données locales avec Stripe tout en maintenant la performance et l'intégrité des données.

## Entity Relationship Diagram

```
┌─────────────────────────┐
│ stripe_configuration    │
├─────────────────────────┤
│ id (PK)                 │
│ secret_key (encrypted)  │
│ publishable_key (enc)   │
│ webhook_secret (enc)    │
│ mode (test/production)  │
│ is_active               │
│ created_at              │
│ updated_at              │
└─────────────────────────┘

┌─────────────────────────┐       ┌──────────────────────────┐
│ subscription_plans      │───┐   │ user (Better Auth)       │
├─────────────────────────┤   │   ├──────────────────────────┤
│ id (PK)                 │   │   │ id (PK)                  │
│ name                    │   │   │ email                    │
│ description             │   │   │ name                     │
│ stripe_product_id       │   │   │ stripe_customer_id       │
│ stripe_price_id         │   │   │ role                     │
│ amount (cents)          │   │   │ ...                      │
│ currency                │   │   └─────────┬────────────────┘
│ interval (month/year)   │   │             │
│ interval_count          │   │             │ 1:N
│ features (jsonb)        │   │             │
│ active                  │   │   ┌─────────▼────────────────┐
│ display_order           │   └───│ user_subscriptions       │
│ created_at              │       ├──────────────────────────┤
│ updated_at              │       │ id (PK)                  │
└─────────────────────────┘       │ user_id (FK → user)      │
                                  │ plan_id (FK → plans)     │
                                  │ stripe_subscription_id   │
                                  │ stripe_customer_id       │
                                  │ status                   │
                                  │ current_period_start     │
                                  │ current_period_end       │
                                  │ cancel_at_period_end     │
                                  │ cancelled_at             │
                                  │ created_at               │
                                  │ updated_at               │
                                  └────────┬─────────────────┘
                                           │
                                           │ 1:N
                                           │
                                  ┌────────▼─────────────────┐
                                  │ payment_history          │
                                  ├──────────────────────────┤
                                  │ id (PK)                  │
                                  │ user_id (FK → user)      │
                                  │ subscription_id (FK)     │
                                  │ stripe_invoice_id        │
                                  │ stripe_payment_intent_id │
                                  │ amount                   │
                                  │ currency                 │
                                  │ status                   │
                                  │ invoice_pdf_url          │
                                  │ paid_at                  │
                                  │ created_at               │
                                  └──────────────────────────┘

┌─────────────────────────┐
│ webhook_logs            │
├─────────────────────────┤
│ id (PK)                 │
│ stripe_event_id (UQ)    │
│ type                    │
│ data (jsonb)            │
│ status                  │
│ error_message           │
│ processed_at            │
│ created_at              │
└─────────────────────────┘
```

## Tables

### 1. stripe_configuration

Stocke la configuration globale de Stripe pour la plateforme. Les clés API sont chiffrées avec AES-256.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| secret_key | TEXT | NOT NULL | Clé secrète Stripe (chiffrée) |
| publishable_key | TEXT | NOT NULL | Clé publique Stripe (chiffrée) |
| webhook_secret | TEXT | NOT NULL | Secret webhook Stripe (chiffré) |
| mode | TEXT | NOT NULL, CHECK (mode IN ('test', 'production')) | Mode Stripe actif |
| is_active | BOOLEAN | DEFAULT TRUE | Configuration active |
| created_at | TIMESTAMP | DEFAULT NOW() | Date de création |
| updated_at | TIMESTAMP | DEFAULT NOW() | Date de dernière modification |

**Indexes**:
- `idx_stripe_config_active` ON (is_active, updated_at DESC)

**Constraints**:
- Seule une configuration peut être active à la fois
- Le mode est automatiquement détecté depuis la clé (sk_test_ ou sk_live_)

**Example**:
```sql
INSERT INTO stripe_configuration (secret_key, publishable_key, webhook_secret, mode)
VALUES (
  '[ENCRYPTED]sk_test_51Abc...', -- Chiffré avec AES-256
  '[ENCRYPTED]pk_test_51Abc...',
  '[ENCRYPTED]whsec_123...',
  'test'
);
```

---

### 2. subscription_plans

Représente les offres d'abonnement disponibles. Chaque plan est synchronisé avec un Product et un Price Stripe.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| name | TEXT | NOT NULL | Nom du plan (ex: "Pro", "Enterprise") |
| description | TEXT | NULL | Description du plan |
| stripe_product_id | TEXT | NOT NULL, UNIQUE | ID du Product Stripe (prod_xxx) |
| stripe_price_id | TEXT | NOT NULL, UNIQUE | ID du Price Stripe (price_xxx) |
| amount | INTEGER | NOT NULL, CHECK (amount >= 0) | Montant en centimes |
| currency | TEXT | NOT NULL, DEFAULT 'eur' | Devise ISO 4217 (eur, usd, gbp) |
| interval | TEXT | NOT NULL, CHECK (interval IN ('month', 'year')) | Intervalle de facturation |
| interval_count | INTEGER | NOT NULL, DEFAULT 1 | Nombre d'intervalles (1 = mensuel, 3 = trimestriel) |
| features | JSONB | NOT NULL, DEFAULT '[]'::jsonb | Liste des features incluses |
| active | BOOLEAN | DEFAULT TRUE | Plan visible pour souscription |
| display_order | INTEGER | DEFAULT 0 | Ordre d'affichage (ASC) |
| created_at | TIMESTAMP | DEFAULT NOW() | Date de création |
| updated_at | TIMESTAMP | DEFAULT NOW() | Date de dernière modification |

**Indexes**:
- `idx_plans_active` ON (active, display_order)
- `idx_plans_stripe_product` ON (stripe_product_id)
- `idx_plans_stripe_price` ON (stripe_price_id)

**Constraints**:
- `stripe_product_id` doit commencer par `prod_`
- `stripe_price_id` doit commencer par `price_`
- `amount` doit être >= 0 (permet offres gratuites)

**Features JSONB Structure**:
```json
[
  "10 GB de stockage",
  "Support prioritaire",
  "API illimitée",
  "Webhooks avancés"
]
```

**Example**:
```sql
INSERT INTO subscription_plans (
  name, description, stripe_product_id, stripe_price_id,
  amount, currency, interval, features, display_order
) VALUES (
  'Pro',
  'Plan professionnel pour équipes',
  'prod_ABC123',
  'price_XYZ789',
  2900, -- 29.00 EUR
  'eur',
  'month',
  '["10 GB stockage", "Support prioritaire", "API illimitée"]'::jsonb,
  2
);
```

---

### 3. user_subscriptions

Représente l'abonnement actif d'un utilisateur. Chaque utilisateur ne peut avoir qu'un seul abonnement actif à la fois.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| user_id | TEXT | NOT NULL, REFERENCES user(id) ON DELETE CASCADE | ID utilisateur Better Auth |
| plan_id | UUID | NOT NULL, REFERENCES subscription_plans(id) | ID du plan souscrit |
| stripe_subscription_id | TEXT | NOT NULL, UNIQUE | ID Subscription Stripe (sub_xxx) |
| stripe_customer_id | TEXT | NOT NULL | ID Customer Stripe (cus_xxx) |
| status | TEXT | NOT NULL | Statut de l'abonnement |
| current_period_start | TIMESTAMP | NOT NULL | Début de la période actuelle |
| current_period_end | TIMESTAMP | NOT NULL | Fin de la période actuelle |
| cancel_at_period_end | BOOLEAN | DEFAULT FALSE | Annulation programmée à la fin de période |
| cancelled_at | TIMESTAMP | NULL | Date d'annulation (si applicable) |
| created_at | TIMESTAMP | DEFAULT NOW() | Date de création |
| updated_at | TIMESTAMP | DEFAULT NOW() | Date de dernière modification |

**Indexes**:
- `idx_subscriptions_user` ON (user_id)
- `idx_subscriptions_stripe_id` ON (stripe_subscription_id)
- `idx_subscriptions_customer` ON (stripe_customer_id)
- `idx_subscriptions_status` ON (status)
- `idx_subscriptions_period_end` ON (current_period_end) WHERE status IN ('active', 'trialing')

**Constraints**:
- Contrainte UNIQUE sur (user_id) WHERE status IN ('active', 'trialing', 'past_due') pour empêcher abonnements multiples
- `stripe_subscription_id` doit commencer par `sub_`
- `stripe_customer_id` doit commencer par `cus_`

**Status Values**:
- `active` : Abonnement actif et payé
- `trialing` : Période d'essai gratuite
- `past_due` : Paiement en retard
- `unpaid` : Paiements échoués
- `cancelled` : Annulé par l'utilisateur ou admin
- `incomplete` : Paiement initial en cours
- `incomplete_expired` : Paiement initial expiré sans succès

**Example**:
```sql
INSERT INTO user_subscriptions (
  user_id, plan_id, stripe_subscription_id, stripe_customer_id,
  status, current_period_start, current_period_end
) VALUES (
  'user_123abc',
  '550e8400-e29b-41d4-a716-446655440000',
  'sub_1ABC123xyz',
  'cus_XYZ789def',
  'active',
  '2025-01-01 00:00:00',
  '2025-02-01 00:00:00'
);
```

---

### 4. payment_history

Enregistre l'historique de tous les paiements (réussis ou échoués) pour traçabilité et facturation.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| user_id | TEXT | NOT NULL, REFERENCES user(id) ON DELETE CASCADE | ID utilisateur |
| subscription_id | UUID | NOT NULL, REFERENCES user_subscriptions(id) | ID abonnement |
| stripe_invoice_id | TEXT | NOT NULL, UNIQUE | ID Invoice Stripe (in_xxx) |
| stripe_payment_intent_id | TEXT | NULL | ID PaymentIntent Stripe (pi_xxx) |
| amount | INTEGER | NOT NULL | Montant en centimes |
| currency | TEXT | NOT NULL | Devise ISO 4217 |
| status | TEXT | NOT NULL | Statut du paiement |
| invoice_pdf_url | TEXT | NULL | URL de la facture PDF (Stripe) |
| paid_at | TIMESTAMP | NULL | Date de paiement (si réussi) |
| created_at | TIMESTAMP | DEFAULT NOW() | Date de création |

**Indexes**:
- `idx_payments_user` ON (user_id, paid_at DESC)
- `idx_payments_subscription` ON (subscription_id)
- `idx_payments_stripe_invoice` ON (stripe_invoice_id)
- `idx_payments_status` ON (status)

**Status Values**:
- `paid` : Paiement réussi
- `open` : Facture en attente de paiement
- `void` : Facture annulée
- `uncollectible` : Paiement impossible (après retries)
- `failed` : Paiement échoué

**Example**:
```sql
INSERT INTO payment_history (
  user_id, subscription_id, stripe_invoice_id,
  stripe_payment_intent_id, amount, currency, status,
  invoice_pdf_url, paid_at
) VALUES (
  'user_123abc',
  '550e8400-e29b-41d4-a716-446655440000',
  'in_1ABC123xyz',
  'pi_1XYZ789def',
  2900, -- 29.00 EUR
  'eur',
  'paid',
  'https://pay.stripe.com/invoice/acct_.../pdf',
  '2025-01-15 10:30:00'
);
```

---

### 5. webhook_logs

Enregistre tous les événements webhook reçus de Stripe pour idempotence et debugging.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Identifiant unique |
| stripe_event_id | TEXT | NOT NULL, UNIQUE | ID événement Stripe (evt_xxx) - Clé d'idempotence |
| type | TEXT | NOT NULL | Type d'événement (customer.subscription.created, etc.) |
| data | JSONB | NOT NULL | Payload complet de l'événement |
| status | TEXT | NOT NULL | Statut du traitement |
| error_message | TEXT | NULL | Message d'erreur (si échec) |
| processed_at | TIMESTAMP | NOT NULL | Date de traitement |
| created_at | TIMESTAMP | DEFAULT NOW() | Date de réception |

**Indexes**:
- `idx_webhooks_event_id` ON (stripe_event_id) UNIQUE
- `idx_webhooks_type` ON (type, processed_at DESC)
- `idx_webhooks_status` ON (status) WHERE status = 'failed'

**Constraints**:
- `stripe_event_id` UNIQUE garantit l'idempotence (pas de double traitement)

**Status Values**:
- `success` : Événement traité avec succès
- `failed` : Échec du traitement (Stripe va retry)

**Example**:
```sql
INSERT INTO webhook_logs (
  stripe_event_id, type, data, status, processed_at
) VALUES (
  'evt_1ABC123xyz',
  'customer.subscription.created',
  '{"id": "sub_123", "customer": "cus_456", ...}'::jsonb,
  'success',
  NOW()
);
```

---

## Database Migration

**File**: `supabase/migrations/20250208000000_stripe_subscriptions.sql`

```sql
-- Migration: Stripe Subscription Management
-- Date: 2025-12-08
-- Feature: 004-stripe-subscription-management

-- Enable UUID extension (si pas déjà activé)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: Configuration Stripe
CREATE TABLE stripe_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_key TEXT NOT NULL,
  publishable_key TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('test', 'production')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stripe_config_active ON stripe_configuration(is_active, updated_at DESC);

COMMENT ON TABLE stripe_configuration IS 'Configuration globale Stripe (clés chiffrées)';
COMMENT ON COLUMN stripe_configuration.secret_key IS 'Clé secrète Stripe chiffrée AES-256';
COMMENT ON COLUMN stripe_configuration.publishable_key IS 'Clé publique Stripe chiffrée';
COMMENT ON COLUMN stripe_configuration.webhook_secret IS 'Secret webhook chiffré';

-- Table 2: Plans d'abonnement
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  stripe_product_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'eur',
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
  interval_count INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_plans_active ON subscription_plans(active, display_order);
CREATE INDEX idx_plans_stripe_product ON subscription_plans(stripe_product_id);
CREATE INDEX idx_plans_stripe_price ON subscription_plans(stripe_price_id);

COMMENT ON TABLE subscription_plans IS 'Plans d\'abonnement synchronisés avec Stripe Products/Prices';
COMMENT ON COLUMN subscription_plans.amount IS 'Montant en centimes (ex: 2900 = 29.00 EUR)';
COMMENT ON COLUMN subscription_plans.features IS 'Array JSON des features du plan';

-- Table 3: Abonnements utilisateurs
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Contrainte: un seul abonnement actif par user
  CONSTRAINT unique_active_subscription_per_user
    EXCLUDE USING gist (user_id WITH =)
    WHERE (status IN ('active', 'trialing', 'past_due'))
);

CREATE INDEX idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON user_subscriptions(current_period_end)
  WHERE status IN ('active', 'trialing');

COMMENT ON TABLE user_subscriptions IS 'Abonnements actifs et historiques des utilisateurs';
COMMENT ON CONSTRAINT unique_active_subscription_per_user ON user_subscriptions IS 'Empêche plusieurs abonnements actifs pour un même user';

-- Table 4: Historique des paiements
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  invoice_pdf_url TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payment_history(user_id, paid_at DESC);
CREATE INDEX idx_payments_subscription ON payment_history(subscription_id);
CREATE INDEX idx_payments_stripe_invoice ON payment_history(stripe_invoice_id);
CREATE INDEX idx_payments_status ON payment_history(status);

COMMENT ON TABLE payment_history IS 'Historique complet des paiements (réussis et échoués)';

-- Table 5: Logs des webhooks Stripe
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  processed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_webhooks_event_id ON webhook_logs(stripe_event_id);
CREATE INDEX idx_webhooks_type ON webhook_logs(type, processed_at DESC);
CREATE INDEX idx_webhooks_status ON webhook_logs(status) WHERE status = 'failed';

COMMENT ON TABLE webhook_logs IS 'Logs des événements webhook Stripe (idempotence + debugging)';
COMMENT ON COLUMN webhook_logs.stripe_event_id IS 'Clé d\'idempotence - garantit traitement unique';

-- Ajouter colonne stripe_customer_id à la table user (Better Auth)
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_stripe_customer
  ON "user"(stripe_customer_id);

COMMENT ON COLUMN "user".stripe_customer_id IS 'ID Customer Stripe associé à cet utilisateur';

-- Triggers pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stripe_configuration_updated_at
  BEFORE UPDATE ON stripe_configuration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed: Plan gratuit par défaut
INSERT INTO subscription_plans (
  name, description, stripe_product_id, stripe_price_id,
  amount, currency, interval, features, active, display_order
) VALUES (
  'Gratuit',
  'Plan gratuit avec fonctionnalités de base',
  'prod_free_default',
  'price_free_default',
  0,
  'eur',
  'month',
  '["Fonctionnalités de base", "Support communautaire"]'::jsonb,
  TRUE,
  1
);
```

---

## Data Synchronization Rules

### User → Stripe Customer

**Trigger**: Lors de la première souscription d'un utilisateur

```typescript
if (!user.stripe_customer_id) {
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  })

  // Sauvegarder l'ID
  await db.updateTable('user')
    .set({ stripe_customer_id: customer.id })
    .where('id', '=', user.id)
    .execute()
}
```

### Stripe Subscription → Local Subscription

**Trigger**: Webhook `customer.subscription.created` ou `customer.subscription.updated`

```typescript
await db.insertInto('user_subscriptions')
  .values({
    user_id: userId,
    plan_id: planId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    status: mapStripeStatus(subscription.status),
    current_period_start: new Date(subscription.current_period_start * 1000),
    current_period_end: new Date(subscription.current_period_end * 1000),
    cancel_at_period_end: subscription.cancel_at_period_end,
  })
  .onConflict((oc) => oc
    .column('stripe_subscription_id')
    .doUpdateSet({
      status: mapStripeStatus(subscription.status),
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date(),
    })
  )
  .execute()
```

### Stripe Invoice → Payment History

**Trigger**: Webhook `invoice.payment_succeeded` ou `invoice.payment_failed`

```typescript
await db.insertInto('payment_history')
  .values({
    user_id: userId,
    subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status === 'paid' ? 'paid' : 'failed',
    invoice_pdf_url: invoice.invoice_pdf,
    paid_at: invoice.status === 'paid' ? new Date(invoice.created * 1000) : null,
  })
  .execute()
```

---

## Performance Considerations

### Indexes

- **Requêtes fréquentes** : user_id, stripe_subscription_id, stripe_customer_id
- **Queries temporelles** : current_period_end (pour détection des expirations)
- **Queries de statut** : status (active, trialing, past_due)

### Partitioning (Future)

Pour les logs de webhooks avec volumes élevés (> 1M rows) :

```sql
-- Partitioning par date de traitement (par mois)
CREATE TABLE webhook_logs_2025_01 PARTITION OF webhook_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Archiving

Stratégie d'archivage pour payment_history (> 2 ans) :

```sql
-- Archiver les paiements anciens
CREATE TABLE payment_history_archive (LIKE payment_history INCLUDING ALL);

INSERT INTO payment_history_archive
  SELECT * FROM payment_history
  WHERE paid_at < NOW() - INTERVAL '2 years';

DELETE FROM payment_history
  WHERE paid_at < NOW() - INTERVAL '2 years';
```

---

## Data Integrity

### Contraintes Critiques

1. **Un seul abonnement actif par utilisateur** : `unique_active_subscription_per_user`
2. **Idempotence webhook** : `stripe_event_id UNIQUE`
3. **Montants non négatifs** : `CHECK (amount >= 0)`
4. **Statuts valides** : `CHECK (status IN (...))`

### Cascade Deletes

- `user_subscriptions.user_id` → CASCADE sur suppression user
- `payment_history.user_id` → CASCADE sur suppression user
- `payment_history.subscription_id` → NO CASCADE (garder l'historique)

---

## Security

### Encryption

- **Clés API Stripe** : Chiffrées avec AES-256 côté application avant INSERT
- **Secrets webhook** : Chiffrés de la même manière
- **Clé de chiffrement** : Stockée dans `STRIPE_ENCRYPTION_KEY` env var (jamais en DB)

### Row-Level Security (RLS)

```sql
-- Activer RLS sur tables sensibles
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Policy: users ne voient que leurs propres données
CREATE POLICY user_subscriptions_policy ON user_subscriptions
  FOR SELECT
  USING (user_id = current_setting('app.user_id')::text);

CREATE POLICY payment_history_policy ON payment_history
  FOR SELECT
  USING (user_id = current_setting('app.user_id')::text);
```

---

## Validation

### Plan Before Implementation

- ✅ Toutes les entités de la spec mappées
- ✅ Relations définies (FK, contraintes)
- ✅ Indexes pour performance
- ✅ Synchronisation Stripe documentée
- ✅ Sécurité (encryption, RLS)
- ✅ Migration SQL complète

**Ready for Phase 2: Task Generation**
