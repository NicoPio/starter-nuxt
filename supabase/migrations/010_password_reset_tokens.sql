-- =====================================================
-- Migration: 010_password_reset_tokens.sql
-- Date: 2025-12-12
-- Feature: 006-password-reset
-- Description: Create password_reset_tokens table
-- =====================================================

-- Table: password_reset_tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used_at
  ON password_reset_tokens(used_at);

-- Commentaires pour documentation
COMMENT ON TABLE password_reset_tokens IS
  'Stores password reset tokens with expiration and usage tracking';

COMMENT ON COLUMN password_reset_tokens.token_hash IS
  'Hashed token (format: salt:hash using scrypt) - NEVER store tokens in plain text';

COMMENT ON COLUMN password_reset_tokens.expires_at IS
  'Token expiration time (1 hour from creation)';

COMMENT ON COLUMN password_reset_tokens.used_at IS
  'Timestamp when the token was used (NULL if unused)';
