-- Migration: Fix Stripe Foreign Keys after Better Auth → nuxt-auth-utils migration
-- Date: 2025-12-11
-- Issue: subscriptions table references old "user" table instead of new "users" table
-- Related: Migration 007 (migrate Better Auth data to nuxt-auth-utils)
-- Note: Foreign key constraint already dropped by CASCADE in migration 008

-- Step 1: Recreate foreign key pointing to "users" table
-- The constraint was already dropped by CASCADE when "user" table was dropped
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 2: Update comment to reflect the change
COMMENT ON COLUMN subscriptions.user_id IS 'Foreign key to users table (nuxt-auth-utils)';

-- Verification query (optional - can be run manually after migration)
-- SELECT COUNT(*) FROM subscriptions s LEFT JOIN users u ON s.user_id = u.id WHERE u.id IS NULL;
-- Expected: 0 orphaned records
