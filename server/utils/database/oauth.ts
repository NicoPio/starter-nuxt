/**
 * OAuth database utilities for nuxt-auth-utils
 */

import { sql } from '../database'
import type { User } from './users'

export interface OAuthAccount {
  id: string
  user_id: string
  provider: string
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

/**
 * Get user by OAuth provider and provider account ID
 * @param provider - OAuth provider (github, google, apple)
 * @param providerAccountId - Provider's user ID
 * @returns User or null if not found
 */
export async function getUserByOAuthProvider(
  provider: string,
  providerAccountId: string
): Promise<User | null> {
  const result = await sql<User[]>`
    SELECT u.* FROM users u
    INNER JOIN oauth_accounts oa ON u.id = oa.user_id
    WHERE oa.provider = ${provider}
      AND oa.provider_account_id = ${providerAccountId}
    LIMIT 1
  `

  return result[0] || null
}

/**
 * Create user from OAuth provider
 * @param userData - User and OAuth data
 * @returns Created user
 */
export async function createUserFromOAuth(userData: {
  email: string
  name: string
  provider: string
  provider_account_id: string
  access_token: string
  refresh_token?: string
  token_expires_at?: Date
  scope?: string
  id_token?: string
  token_type?: string
}): Promise<User> {
  // Generate a unique ID
  const userId = `cm${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`

  // Create user
  const userResult = await sql<User[]>`
    INSERT INTO users (id, email, name, role)
    VALUES (
      ${userId},
      ${userData.email},
      ${userData.name},
      'User'
    )
    RETURNING *
  `

  // Create OAuth account
  await sql`
    INSERT INTO oauth_accounts (
      user_id,
      provider,
      provider_account_id,
      access_token,
      refresh_token,
      token_expires_at,
      scope,
      id_token,
      token_type
    )
    VALUES (
      ${userId},
      ${userData.provider},
      ${userData.provider_account_id},
      ${userData.access_token},
      ${userData.refresh_token || null},
      ${userData.token_expires_at || null},
      ${userData.scope || null},
      ${userData.id_token || null},
      ${userData.token_type || 'Bearer'}
    )
  `

  return userResult[0]!
}

/**
 * Update OAuth tokens
 * @param provider - OAuth provider
 * @param providerAccountId - Provider's user ID
 * @param tokens - New tokens
 */
export async function updateOAuthTokens(
  provider: string,
  providerAccountId: string,
  tokens: {
    access_token: string
    refresh_token?: string
    token_expires_at?: Date
  }
): Promise<void> {
  await sql`
    UPDATE oauth_accounts
    SET
      access_token = ${tokens.access_token},
      refresh_token = COALESCE(${tokens.refresh_token || null}, refresh_token),
      token_expires_at = COALESCE(${tokens.token_expires_at || null}, token_expires_at),
      updated_at = NOW()
    WHERE provider = ${provider}
      AND provider_account_id = ${providerAccountId}
  `
}

/**
 * Get OAuth accounts for a user
 * @param userId - User ID
 * @returns Array of OAuth accounts
 */
export async function getUserOAuthAccounts(userId: string): Promise<OAuthAccount[]> {
  return await sql<OAuthAccount[]>`
    SELECT * FROM oauth_accounts
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
}
