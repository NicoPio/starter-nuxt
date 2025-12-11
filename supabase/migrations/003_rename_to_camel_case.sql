-- Migration: Rename columns from snake_case to camelCase for Better Auth compatibility
-- Date: 2025-12-09

-- User table
ALTER TABLE "user" RENAME COLUMN email_verified TO "emailVerified";
ALTER TABLE "user" RENAME COLUMN created_at TO "createdAt";
ALTER TABLE "user" RENAME COLUMN updated_at TO "updatedAt";

-- Session table
ALTER TABLE "session" RENAME COLUMN user_id TO "userId";
ALTER TABLE "session" RENAME COLUMN expires_at TO "expiresAt";
ALTER TABLE "session" RENAME COLUMN ip_address TO "ipAddress";
ALTER TABLE "session" RENAME COLUMN user_agent TO "userAgent";
ALTER TABLE "session" RENAME COLUMN created_at TO "createdAt";
ALTER TABLE "session" RENAME COLUMN updated_at TO "updatedAt";

-- Account table
ALTER TABLE "account" RENAME COLUMN user_id TO "userId";
ALTER TABLE "account" RENAME COLUMN account_id TO "accountId";
ALTER TABLE "account" RENAME COLUMN provider_account_id TO "providerAccountId";
ALTER TABLE "account" RENAME COLUMN access_token TO "accessToken";
ALTER TABLE "account" RENAME COLUMN refresh_token TO "refreshToken";
ALTER TABLE "account" RENAME COLUMN expires_at TO "expiresAt";
ALTER TABLE "account" RENAME COLUMN id_token TO "idToken";
ALTER TABLE "account" RENAME COLUMN token_type TO "tokenType";
ALTER TABLE "account" RENAME COLUMN created_at TO "createdAt";
ALTER TABLE "account" RENAME COLUMN updated_at TO "updatedAt";

-- Verification table
ALTER TABLE "verification" RENAME COLUMN expires_at TO "expiresAt";
ALTER TABLE "verification" RENAME COLUMN created_at TO "createdAt";
ALTER TABLE "verification" RENAME COLUMN updated_at TO "updatedAt";

-- Password table
ALTER TABLE "password" RENAME COLUMN user_id TO "userId";
ALTER TABLE "password" RENAME COLUMN hashed_password TO "hashedPassword";
