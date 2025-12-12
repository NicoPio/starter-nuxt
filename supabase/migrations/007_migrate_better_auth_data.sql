-- =====================================================
-- Migration: 007_migrate_better_auth_data.sql
-- Date: 2025-12-10
-- Feature: 005-migrate-nuxt-auth-utils
-- Description: Migrate data from Better Auth to nuxt-auth-utils
-- =====================================================

-- ÉTAPE 1: Migrer users + passwords (JOIN avec account table)
-- Note: Les colonnes Better Auth sont en camelCase après migration 003
INSERT INTO users (
  id,
  email,
  name,
  role,
  hashed_password,
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
  a.password,                           -- Password stocké dans account table (Better Auth migration 005)
  u."emailVerified",
  u.image,
  u."createdAt",
  u."updatedAt"
FROM "user" u
LEFT JOIN "account" a ON u.id = a."userId" AND a."providerId" = 'credential'
ON CONFLICT (id) DO NOTHING;            -- Idempotent

-- Validation users
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
-- Note: Exclure les comptes "credential" qui sont pour password auth
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
  "userId",
  "providerId",
  "providerAccountId",
  "accessToken",
  "refreshToken",
  "expiresAt",
  scope,
  "idToken",
  "tokenType",
  "createdAt",
  "updatedAt"
FROM "account"
WHERE "providerId" != 'credential'      -- Exclure les comptes password
ON CONFLICT (provider, provider_account_id) DO NOTHING;  -- Idempotent

-- Validation OAuth accounts
DO $$
DECLARE
  count_account INTEGER;
  count_oauth INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_account FROM "account" WHERE "providerId" != 'credential';
  SELECT COUNT(*) INTO count_oauth FROM oauth_accounts;

  IF count_account != count_oauth THEN
    RAISE EXCEPTION 'Migration failed: OAuth account count mismatch (% vs %)', count_account, count_oauth;
  END IF;

  RAISE NOTICE 'OAuth accounts migrated successfully: % rows', count_oauth;
END $$;

-- ÉTAPE 3: Note pour Foreign Keys Stripe
-- Les tables Stripe référencent "user"(id) qui sera conservé temporairement
-- Aucune action nécessaire maintenant - les FKs seront mises à jour après validation complète
