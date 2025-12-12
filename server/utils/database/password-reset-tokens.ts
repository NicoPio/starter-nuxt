/**
 * Password Reset Tokens database utilities
 */

import { sql } from '../database'

export interface PasswordResetToken {
  id: string
  user_id: string
  token_hash: string
  expires_at: Date
  created_at: Date
  used_at: Date | null
}

export interface CreatePasswordResetTokenData {
  userId: string
  tokenHash: string
  expiresAt: Date
}

export interface TokenValidationResult {
  isValid: boolean
  reason?: 'TOKEN_NOT_FOUND' | 'TOKEN_EXPIRED' | 'TOKEN_USED' | 'TOKEN_INVALID'
  token?: PasswordResetToken
}

/**
 * Crée un nouveau token de réinitialisation
 *
 * @param data - Données du token (userId, tokenHash, expiresAt)
 * @returns Token créé avec son ID et dates
 */
export async function createPasswordResetToken(
  data: CreatePasswordResetTokenData
): Promise<PasswordResetToken> {
  const result = await sql<PasswordResetToken[]>`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${data.userId}, ${data.tokenHash}, ${data.expiresAt})
    RETURNING *
  `

  if (!result[0]) {
    throw new Error('Failed to create password reset token')
  }

  return result[0]
}

/**
 * Trouve un token par son ID
 *
 * @param id - UUID du token
 * @returns Token ou null si non trouvé
 */
export async function getPasswordResetTokenById(
  id: string
): Promise<PasswordResetToken | null> {
  const result = await sql<PasswordResetToken[]>`
    SELECT * FROM password_reset_tokens
    WHERE id = ${id}
    LIMIT 1
  `

  return result[0] || null
}

/**
 * Trouve tous les tokens d'un utilisateur (actifs, expirés, utilisés)
 *
 * @param userId - ID de l'utilisateur
 * @returns Liste des tokens
 */
export async function getPasswordResetTokensByUserId(
  userId: string
): Promise<PasswordResetToken[]> {
  return await sql<PasswordResetToken[]>`
    SELECT * FROM password_reset_tokens
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
}

/**
 * Trouve un token valide par son hash
 *
 * Un token est considéré valide si :
 * - Il existe en base de données
 * - Il n'est pas expiré (expires_at > NOW())
 * - Il n'a pas été utilisé (used_at IS NULL)
 *
 * @param tokenHash - Hash du token (format: salt:hash)
 * @returns Token valide ou null
 */
export async function findValidPasswordResetToken(
  tokenHash: string
): Promise<PasswordResetToken | null> {
  const result = await sql<PasswordResetToken[]>`
    SELECT * FROM password_reset_tokens
    WHERE token_hash = ${tokenHash}
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `

  return result[0] || null
}

/**
 * Marque un token comme utilisé
 *
 * @param id - UUID du token
 * @returns true si le token a été marqué, false sinon
 */
export async function markPasswordResetTokenAsUsed(id: string): Promise<boolean> {
  const result = await sql<PasswordResetToken[]>`
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE id = ${id}
      AND used_at IS NULL
    RETURNING *
  `

  return result.length > 0
}

/**
 * Invalide tous les tokens actifs d'un utilisateur
 *
 * Utile lors de :
 * - Nouvelle demande de réinitialisation (invalider les anciens)
 * - Réinitialisation réussie (invalider tous les autres)
 *
 * @param userId - ID de l'utilisateur
 * @returns Nombre de tokens invalidés
 */
export async function invalidateAllUserPasswordResetTokens(
  userId: string
): Promise<number> {
  const result = await sql<PasswordResetToken[]>`
    UPDATE password_reset_tokens
    SET expires_at = NOW()
    WHERE user_id = ${userId}
      AND used_at IS NULL
      AND expires_at > NOW()
    RETURNING *
  `

  return result.length
}

/**
 * Supprime tous les tokens d'un utilisateur
 *
 * @param userId - ID de l'utilisateur
 * @returns Nombre de tokens supprimés
 */
export async function deleteAllUserPasswordResetTokens(
  userId: string
): Promise<number> {
  const result = await sql<PasswordResetToken[]>`
    DELETE FROM password_reset_tokens
    WHERE user_id = ${userId}
    RETURNING *
  `

  return result.length
}

/**
 * Supprime les tokens expirés depuis plus de 24h (nettoyage périodique)
 *
 * @returns Nombre de tokens supprimés
 */
export async function deleteExpiredPasswordResetTokens(): Promise<number> {
  const result = await sql<PasswordResetToken[]>`
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW() - INTERVAL '24 hours'
    RETURNING *
  `

  return result.length
}

/**
 * Vérifie la dernière demande de réinitialisation d'un utilisateur
 *
 * Utilisé pour le rate limiting (max 1 demande par 5 minutes)
 *
 * @param userId - ID de l'utilisateur
 * @param rateLimitMs - Durée minimale entre deux demandes (millisecondes)
 * @returns Token récent si rate limit atteint, null sinon
 */
export async function getRecentPasswordResetTokenForUser(
  userId: string,
  rateLimitMs: number
): Promise<PasswordResetToken | null> {
  const rateLimitDate = new Date(Date.now() - rateLimitMs)

  const result = await sql<PasswordResetToken[]>`
    SELECT * FROM password_reset_tokens
    WHERE user_id = ${userId}
      AND created_at > ${rateLimitDate}
    ORDER BY created_at DESC
    LIMIT 1
  `

  return result[0] || null
}

/**
 * Valide un token complet (existence, expiration, utilisation)
 *
 * @param tokenHash - Hash du token à valider
 * @returns Résultat de validation avec raison si invalide
 */
export async function validatePasswordResetToken(
  tokenHash: string
): Promise<TokenValidationResult> {
  const token = await getPasswordResetTokenById(tokenHash)

  if (!token) {
    return {
      isValid: false,
      reason: 'TOKEN_NOT_FOUND',
    }
  }

  if (token.used_at) {
    return {
      isValid: false,
      reason: 'TOKEN_USED',
      token,
    }
  }

  if (new Date() > new Date(token.expires_at)) {
    return {
      isValid: false,
      reason: 'TOKEN_EXPIRED',
      token,
    }
  }

  return {
    isValid: true,
    token,
  }
}

/**
 * Statistiques des tokens (utile pour debugging/monitoring)
 *
 * @returns Compteurs des tokens actifs, utilisés, expirés
 */
export async function getPasswordResetTokenStats(): Promise<{
  active: number
  used: number
  expired: number
  total: number
}> {
  const result = await sql<
    Array<{
      active: string
      used: string
      expired: string
      total: string
    }>
  >`
    SELECT
      COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at > NOW()) AS active,
      COUNT(*) FILTER (WHERE used_at IS NOT NULL) AS used,
      COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at <= NOW()) AS expired,
      COUNT(*) AS total
    FROM password_reset_tokens
  `

  const stats = result[0]
  return {
    active: parseInt(stats.active, 10),
    used: parseInt(stats.used, 10),
    expired: parseInt(stats.expired, 10),
    total: parseInt(stats.total, 10),
  }
}
