-- File: supabase/migrations/008_cleanup_better_auth.sql
-- Date: 2025-12-10
-- Feature: 005-migrate-nuxt-auth-utils
-- Description: Remove Better Auth tables (RUN AFTER 7 DAYS MONITORING)

-- ⚠️ ATTENTION: Exécuter UNIQUEMENT après validation complète (7 jours min)

-- ============================================================================
-- STEP 1: Create backups before cleanup
-- ============================================================================

-- Backup Better Auth tables
CREATE TABLE IF NOT EXISTS _backup_better_auth_user AS SELECT * FROM "user";
CREATE TABLE IF NOT EXISTS _backup_better_auth_password AS SELECT * FROM "password";
CREATE TABLE IF NOT EXISTS _backup_better_auth_account AS SELECT * FROM "account";
CREATE TABLE IF NOT EXISTS _backup_better_auth_session AS SELECT * FROM "session";
CREATE TABLE IF NOT EXISTS _backup_better_auth_verification AS SELECT * FROM "verification";

DO $$
BEGIN
  RAISE NOTICE 'Backups created successfully';
END $$;

-- ============================================================================
-- STEP 2: Drop Better Auth tables (CASCADE to remove dependencies)
-- ============================================================================

-- Drop tables in order (respecting FK constraints)
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "verification" CASCADE;
DROP TABLE IF EXISTS "password" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

DO $$
BEGIN
  RAISE NOTICE 'Better Auth tables dropped successfully';
END $$;

-- ============================================================================
-- STEP 3: Drop Better Auth-specific triggers and functions (if any)
-- ============================================================================

-- Drop triggers (already dropped via CASCADE, but for safety)
DROP TRIGGER IF EXISTS update_user_updated_at ON "user";
DROP TRIGGER IF EXISTS update_session_updated_at ON "session";
DROP TRIGGER IF EXISTS update_account_updated_at ON "account";
DROP TRIGGER IF EXISTS update_verification_updated_at ON "verification";

DO $$
BEGIN
  RAISE NOTICE 'Better Auth triggers dropped successfully';
END $$;

-- Note: We keep the update_updated_at_column() function as it's used by nuxt-auth-utils tables

-- ============================================================================
-- STEP 4: Validation
-- ============================================================================

-- Verify no Better Auth tables remain
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('user', 'password', 'account', 'session', 'verification');

  IF table_count > 0 THEN
    RAISE EXCEPTION 'Cleanup failed: % Better Auth tables still exist', table_count;
  END IF;

  RAISE NOTICE 'Validation passed: No Better Auth tables found';
END $$;

-- Verify nuxt-auth-utils tables exist
DO $$
DECLARE
  users_count INTEGER;
  oauth_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_count FROM users;
  SELECT COUNT(*) INTO oauth_count FROM oauth_accounts;

  IF users_count = 0 THEN
    RAISE WARNING 'Warning: users table is empty!';
  END IF;

  RAISE NOTICE 'nuxt-auth-utils tables validated: users (%), oauth_accounts (%)', users_count, oauth_count;
END $$;

-- ============================================================================
-- STEP 5: Cleanup complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===================================================================';
  RAISE NOTICE 'Better Auth cleanup completed successfully';
  RAISE NOTICE '===================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Backups available in tables:';
  RAISE NOTICE '  - _backup_better_auth_user';
  RAISE NOTICE '  - _backup_better_auth_password';
  RAISE NOTICE '  - _backup_better_auth_account';
  RAISE NOTICE '  - _backup_better_auth_session';
  RAISE NOTICE '  - _backup_better_auth_verification';
  RAISE NOTICE '';
  RAISE NOTICE 'To drop backups (after final validation):';
  RAISE NOTICE '  DROP TABLE _backup_better_auth_*;';
  RAISE NOTICE '';
  RAISE NOTICE '===================================================================';
END $$;
