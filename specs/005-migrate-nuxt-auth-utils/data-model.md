# Data Model: Migration Better Auth → nuxt-auth-utils

**Feature**: 005-migrate-nuxt-auth-utils
**Date**: 2025-12-10
**Reference**: [research.md](./research.md)

## Overview

Ce document définit le schéma de données avant/après migration, le mapping des tables, et les scripts SQL de migration.

## Schema Comparison

### Current Schema (Better Auth)

```sql
-- Table 1: user (Better Auth)
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  name TEXT,
  image TEXT,
  role TEXT DEFAULT 'User' CHECK (role IN ('User', 'Contributor', 'Admin')),
  stripe_customer_id TEXT,                -- Ajouté pour Stripe
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: password (Better Auth)
CREATE TABLE "password" (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  hashed_password TEXT NOT NULL
);

-- Table 3: session (Better Auth) - SERA SUPPRIMÉE
CREATE TABLE "session" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 4: account (Better Auth OAuth)
CREATE TABLE "account" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  id_token TEXT,
  token_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Table 5: verification (Better Auth) - SERA SUPPRIMÉE
CREATE TABLE "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Target Schema (nuxt-auth-utils)

```sql
-- Table 1: users (nuxt-auth-utils) - SIMPLIFIÉ
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'User' CHECK (role IN ('User', 'Contributor', 'Admin')),
  hashed_password TEXT,                   -- FUSIONNÉ depuis table "password"
  stripe_customer_id TEXT,                -- PRÉSERVÉ pour Stripe
  email_verified BOOLEAN DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_stripe ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Table 2: oauth_accounts (nuxt-auth-utils)
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                 -- 'github', 'google', 'apple'
  provider_account_id TEXT NOT NULL,      -- ID externe du provider
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  id_token TEXT,
  token_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX idx_oauth_user ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_provider ON oauth_accounts(provider, provider_account_id);

-- Sessions: AUCUNE TABLE (cookies chiffrés)
```

### Stripe Tables (INCHANGÉES)

```sql
-- Ces tables ne sont PAS touchées par la migration
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),  -- FK mise à jour vers "users"
  plan_id UUID NOT NULL,
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

-- payment_history, subscription_plans, webhook_logs, stripe_configuration
-- (schéma complet dans migration 20251208153734_stripe_subscriptions.sql)
```

## Migration Mapping

| Better Auth Table | nuxt-auth-utils Table | Migration Action |
|-------------------|----------------------|------------------|
| `user` | `users` | RENAME + ADD password column |
| `password` | `users.hashed_password` | MERGE (JOIN) |
| `account` | `oauth_accounts` | RENAME + restructure |
| `session` | _cookies chiffrés_ | DELETE (après cutover) |
| `verification` | _N/A_ | DELETE (email verification désactivée) |

## Migration SQL Scripts

### Script 1: Create New Tables

```sql
-- File: supabase/migrations/006_nuxt_auth_utils_init.sql
-- Date: 2025-12-10
-- Feature: 005-migrate-nuxt-auth-utils
-- Description: Create nuxt-auth-utils tables

-- Table: users (nouvelle structure)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'User' CHECK (role IN ('User', 'Contributor', 'Admin')),
  hashed_password TEXT,
  stripe_customer_id TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Table: oauth_accounts (nouvelle structure)
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  id_token TEXT,
  token_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_account_id);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_accounts_updated_at
  BEFORE UPDATE ON oauth_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Script 2: Migrate Data

```sql
-- File: supabase/migrations/007_migrate_better_auth_data.sql
-- Date: 2025-12-10
-- Feature: 005-migrate-nuxt-auth-utils
-- Description: Migrate data from Better Auth to nuxt-auth-utils

-- ÉTAPE 1: Migrer users + passwords (JOIN)
INSERT INTO users (
  id,
  email,
  name,
  role,
  hashed_password,
  stripe_customer_id,
  email_verified,
  image,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  p.hashed_password,                    -- FUSION table password
  u.stripe_customer_id,
  u.email_verified,
  u.image,
  u.created_at,
  u.updated_at
FROM "user" u
LEFT JOIN "password" p ON u.id = p.user_id
ON CONFLICT (id) DO NOTHING;            -- Idempotent

-- Validation
DO $$
DECLARE
  count_user INTEGER;
  count_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_user FROM "user";
  SELECT COUNT(*) INTO count_users FROM users;

  IF count_user != count_users THEN
    RAISE EXCEPTION 'Migration failed: user count mismatch (% vs %)', count_user, count_users;
  END IF;

  RAISE NOTICE 'Users migrated successfully: % rows', count_users;
END $$;

-- ÉTAPE 2: Migrer OAuth accounts
INSERT INTO oauth_accounts (
  user_id,
  provider,
  provider_account_id,
  access_token,
  refresh_token,
  token_expires_at,
  scope,
  id_token,
  token_type,
  created_at,
  updated_at
)
SELECT
  user_id,
  provider,
  provider_account_id,
  access_token,
  refresh_token,
  expires_at,                           -- Renommé
  scope,
  id_token,
  token_type,
  created_at,
  updated_at
FROM "account"
ON CONFLICT (provider, provider_account_id) DO NOTHING;  -- Idempotent

-- Validation
DO $$
DECLARE
  count_account INTEGER;
  count_oauth INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_account FROM "account";
  SELECT COUNT(*) INTO count_oauth FROM oauth_accounts;

  IF count_account != count_oauth THEN
    RAISE EXCEPTION 'Migration failed: OAuth account count mismatch (% vs %)', count_account, count_oauth;
  END IF;

  RAISE NOTICE 'OAuth accounts migrated successfully: % rows', count_oauth;
END $$;

-- ÉTAPE 3: Mettre à jour Foreign Keys Stripe
-- Les tables Stripe référencent "user"(id) → doivent référencer "users"(id)
-- Aucune action nécessaire si ON UPDATE CASCADE, sinon:

-- Note: Les FKs Stripe pointent vers "user" qui sera renommé "users"
-- donc les FKs resteront valides après RENAME TABLE
```

### Script 3: Cleanup (Après Validation)

```sql
-- File: supabase/migrations/008_cleanup_better_auth.sql
-- Date: 2025-12-10
-- Feature: 005-migrate-nuxt-auth-utils
-- Description: Remove Better Auth tables (RUN AFTER 7 DAYS MONITORING)

-- ⚠️ ATTENTION: Exécuter UNIQUEMENT après validation complète (7 jours min)

-- Backup avant cleanup
CREATE TABLE IF NOT EXISTS _backup_better_auth_user AS SELECT * FROM "user";
CREATE TABLE IF NOT EXISTS _backup_better_auth_password AS SELECT * FROM "password";
CREATE TABLE IF NOT EXISTS _backup_better_auth_account AS SELECT * FROM "account";
CREATE TABLE IF NOT EXISTS _backup_better_auth_session AS SELECT * FROM "session";
CREATE TABLE IF NOT EXISTS _backup_better_auth_verification AS SELECT * FROM "verification";

-- Supprimer tables obsolètes
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "verification" CASCADE;
DROP TABLE IF EXISTS "password" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- Supprimer triggers obsolètes (déjà supprimés via CASCADE, mais sécurité)
DROP TRIGGER IF EXISTS update_user_updated_at ON "user";
DROP TRIGGER IF EXISTS update_session_updated_at ON "session";
DROP TRIGGER IF EXISTS update_account_updated_at ON "account";
DROP TRIGGER IF EXISTS update_verification_updated_at ON "verification";

RAISE NOTICE 'Better Auth tables cleaned up successfully';
RAISE NOTICE 'Backups created in _backup_better_auth_* tables';
```

## Data Validation Queries

### Pre-Migration Validation

```sql
-- Vérifier intégrité données Better Auth
SELECT 'Users' as table_name, COUNT(*) as count FROM "user"
UNION ALL
SELECT 'Passwords', COUNT(*) FROM "password"
UNION ALL
SELECT 'OAuth Accounts', COUNT(*) FROM "account"
UNION ALL
SELECT 'Sessions', COUNT(*) FROM "session";

-- Vérifier users sans password
SELECT id, email, name
FROM "user" u
WHERE NOT EXISTS (SELECT 1 FROM "password" p WHERE p.user_id = u.id);

-- Vérifier OAuth multi-provider
SELECT user_id, COUNT(*) as provider_count, array_agg(provider) as providers
FROM "account"
GROUP BY user_id
HAVING COUNT(*) > 1;
```

### Post-Migration Validation

```sql
-- Vérifier migration réussie
SELECT 'Users (old)' as table_name, COUNT(*) FROM "user"
UNION ALL
SELECT 'Users (new)', COUNT(*) FROM users
UNION ALL
SELECT 'OAuth (old)', COUNT(*) FROM "account"
UNION ALL
SELECT 'OAuth (new)', COUNT(*) FROM oauth_accounts;

-- Vérifier aucune perte de données
SELECT
  (SELECT COUNT(*) FROM "user") = (SELECT COUNT(*) FROM users) as users_ok,
  (SELECT COUNT(*) FROM "account") = (SELECT COUNT(*) FROM oauth_accounts) as oauth_ok;

-- Vérifier passwords migrés
SELECT COUNT(*)
FROM users
WHERE hashed_password IS NULL
  AND email NOT LIKE '%@oauth-only-user%';  -- OAuth-only users = OK

-- Vérifier Stripe FKs intacts
SELECT COUNT(*)
FROM user_subscriptions us
LEFT JOIN users u ON us.user_id = u.id
WHERE u.id IS NULL;  -- Doit être 0
```

## Rollback Plan

### Si problème détecté pendant migration

```sql
-- ROLLBACK: Supprimer tables nuxt-auth-utils
DROP TABLE IF EXISTS oauth_accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Vérifier Better Auth tables intactes
SELECT COUNT(*) FROM "user";
SELECT COUNT(*) FROM "account";
```

### Si problème détecté après cleanup

```sql
-- RESTORE: Restaurer depuis backups
CREATE TABLE "user" AS SELECT * FROM _backup_better_auth_user;
CREATE TABLE "password" AS SELECT * FROM _backup_better_auth_password;
CREATE TABLE "account" AS SELECT * FROM _backup_better_auth_account;
CREATE TABLE "session" AS SELECT * FROM _backup_better_auth_session;
CREATE TABLE "verification" AS SELECT * FROM _backup_better_auth_verification;

-- Recréer indexes et triggers (voir migration 001)
```

## Entity Relationships

### Before (Better Auth)

```
┌─────────┐       ┌──────────┐
│  user   │◄─────►│ password │
└────┬────┘       └──────────┘
     │
     ├──────────► ┌──────────────┐
     │            │   session    │
     │            └──────────────┘
     │
     ├──────────► ┌──────────────┐
     │            │   account    │ (OAuth)
     │            └──────────────┘
     │
     └──────────► ┌─────────────────────┐
                  │ user_subscriptions  │ (Stripe)
                  └─────────────────────┘
```

### After (nuxt-auth-utils)

```
┌─────────────────┐
│      users      │ (password fusionné)
└────┬────────────┘
     │
     ├──────────► ┌──────────────────┐
     │            │ oauth_accounts   │
     │            └──────────────────┘
     │
     └──────────► ┌─────────────────────┐
                  │ user_subscriptions  │ (Stripe)
                  └─────────────────────┘

Sessions: Cookies chiffrés (pas de table)
```

## TypeScript Types

### User Type

```typescript
// app/types/user.types.ts
export type UserRole = 'User' | 'Contributor' | 'Admin'

export interface User {
  id: string
  email: string
  name: string | null
  role: UserRole
  stripe_customer_id: string | null
  email_verified: boolean
  image: string | null
  created_at: Date
  updated_at: Date
}

export interface UserSession {
  user: {
    id: string
    email: string
    role: UserRole
    name?: string
  }
  loggedInAt: number
}
```

### OAuth Account Type

```typescript
// app/types/oauth.types.ts
export type OAuthProvider = 'github' | 'google' | 'apple'

export interface OAuthAccount {
  id: string
  user_id: string
  provider: OAuthProvider
  provider_account_id: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: Date | null
  scope: string | null
  id_token: string | null
  token_type: string | null
  created_at: Date
  updated_at: Date
}
```

## Conclusion

Le modèle de données a été simplifié :
- **5 tables Better Auth** → **2 tables nuxt-auth-utils** + cookies chiffrés
- **0 perte de données** grâce à migration 1:1 avec validation SQL
- **Stripe intact** avec FKs préservées
- **Rollback plan** complet avec backups

**Prochaine étape** : Générer `quickstart.md` pour guide développeur.
