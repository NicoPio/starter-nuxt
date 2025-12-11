-- Migration: Stripe Subscription Management
-- Date: 2025-12-08
-- Feature: 004-stripe-subscription-management

-- Enable UUID extension (si pas déjà activé)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

COMMENT ON TABLE subscription_plans IS 'Plans d''abonnement synchronisés avec Stripe Products/Prices';
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
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_period_end ON user_subscriptions(current_period_end)
  WHERE status IN ('active', 'trialing');

-- Contrainte: un seul abonnement actif par user
CREATE UNIQUE INDEX unique_active_subscription_per_user
  ON user_subscriptions(user_id)
  WHERE status IN ('active', 'trialing', 'past_due');

COMMENT ON TABLE user_subscriptions IS 'Abonnements actifs et historiques des utilisateurs';
COMMENT ON INDEX unique_active_subscription_per_user IS 'Empêche plusieurs abonnements actifs pour un même user';

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
COMMENT ON COLUMN webhook_logs.stripe_event_id IS 'Clé d''idempotence - garantit traitement unique';

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

-- Seed: Plan gratuit par défaut (optionnel, décommenter si besoin)
-- INSERT INTO subscription_plans (
--   name, description, stripe_product_id, stripe_price_id,
--   amount, currency, interval, features, active, display_order
-- ) VALUES (
--   'Gratuit',
--   'Plan gratuit avec fonctionnalités de base',
--   'prod_free_default',
--   'price_free_default',
--   0,
--   'eur',
--   'month',
--   '["Fonctionnalités de base", "Support communautaire"]'::jsonb,
--   TRUE,
--   1
-- );
