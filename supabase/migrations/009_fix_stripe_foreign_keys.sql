-- Migration: Fix Stripe Foreign Keys after Better Auth → nuxt-auth-utils migration
-- Date: 2025-12-11
-- Issue: user_subscriptions and payment_history reference old "user" table instead of new "users" table
-- Related: Migration 007 (migrate Better Auth data to nuxt-auth-utils)

-- Step 1: Drop existing foreign key constraints
ALTER TABLE user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

ALTER TABLE payment_history
  DROP CONSTRAINT IF EXISTS payment_history_user_id_fkey;

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

-- Step 2: Recreate foreign keys pointing to "users" table
ALTER TABLE user_subscriptions
  ADD CONSTRAINT user_subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE payment_history
  ADD CONSTRAINT payment_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 3: Update comments to reflect the change
COMMENT ON COLUMN user_subscriptions.user_id IS 'Foreign key to users table (nuxt-auth-utils)';
COMMENT ON COLUMN payment_history.user_id IS 'Foreign key to users table (nuxt-auth-utils)';
COMMENT ON COLUMN subscriptions.user_id IS 'Foreign key to users table (nuxt-auth-utils)';

-- Verification queries (optional - can be run manually after migration)
-- SELECT COUNT(*) FROM user_subscriptions us LEFT JOIN users u ON us.user_id = u.id WHERE u.id IS NULL;
-- SELECT COUNT(*) FROM payment_history ph LEFT JOIN users u ON ph.user_id = u.id WHERE u.id IS NULL;
-- Expected: 0 orphaned records
