-- Migration: Rename provider to providerId in account table
-- Date: 2025-12-09
-- Reason: Better Auth expects providerId, not provider

ALTER TABLE account RENAME COLUMN provider TO "providerId";

-- Recréer l'index avec le nouveau nom de colonne
DROP INDEX IF EXISTS idx_account_provider;
CREATE INDEX idx_account_provider ON account("providerId", "providerAccountId");
