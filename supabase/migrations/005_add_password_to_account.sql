-- Migration: Add password column to account table
-- Date: 2025-12-09
-- Reason: Better Auth stores password in account table, not in a separate password table

-- Add password column to account table
ALTER TABLE account ADD COLUMN IF NOT EXISTS password TEXT;

-- Migrate existing passwords from password table to account table
UPDATE account
SET password = (
  SELECT "hashedPassword"
  FROM password
  WHERE password."userId" = account."userId"
)
WHERE account."providerId" = 'credential';

-- Note: We keep the password table for backward compatibility
-- but Better Auth will use the account.password column
