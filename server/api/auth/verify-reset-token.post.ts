import { z } from 'zod'
import { sql } from '../../utils/database'
import { verifyPasswordResetToken } from '../../utils/crypto'

// Schéma de validation Zod
const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export default defineEventHandler(async (event) => {
  try {
    // 1. Validation des données
    const body = await readBody(event)
    const result = verifyTokenSchema.safeParse(body)

    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid token',
        message: 'Le token fourni est invalide',
        data: { reason: 'TOKEN_INVALID' },
      })
    }

    const { token } = result.data

    // 2. Pour chaque token dans la base de données, vérifier si le hash correspond
    // Note: On ne peut pas chercher directement par hash car le token en clair
    // doit être hashé avec le même salt pour correspondre
    // Stratégie: On doit récupérer tous les tokens valides et les comparer un par un
    // Pour éviter une attaque par timing, on continue à vérifier tous les tokens même après avoir trouvé une correspondance

    // Chercher tous les tokens non utilisés et non expirés
    // Cette requête est optimisée par les indexes sur used_at et expires_at
    const allValidTokens = await sql<{ id: string; token_hash: string; user_id: string; expires_at: Date }[]>`
      SELECT id, token_hash, user_id, expires_at
      FROM password_reset_tokens
      WHERE used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 100
    `

    if (allValidTokens.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid token',
        message: 'Ce lien est invalide ou a expiré',
        data: { reason: 'TOKEN_NOT_FOUND' },
      })
    }

    // 3. Vérifier le token avec chaque hash (protection contre timing attacks)
    let matchedToken: { id: string; user_id: string; expires_at: Date } | null = null

    for (const dbToken of allValidTokens) {
      const isMatch = verifyPasswordResetToken(token, dbToken.token_hash)
      if (isMatch) {
        matchedToken = {
          id: dbToken.id,
          user_id: dbToken.user_id,
          expires_at: dbToken.expires_at,
        }
        // Continue checking other tokens to prevent timing attacks
      }
    }

    if (!matchedToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid token',
        message: 'Ce lien est invalide ou a expiré',
        data: { reason: 'TOKEN_INVALID' },
      })
    }

    // 4. Token valide - retourner les informations
    console.log('[VerifyResetToken] Token verified:', {
      tokenId: matchedToken.id,
      userId: matchedToken.user_id,
      expiresAt: matchedToken.expires_at,
    })

    return {
      isValid: true,
      expiresAt: matchedToken.expires_at,
    }
  } catch (error) {
    // Gestion des erreurs
    if (error instanceof Error && 'statusCode' in error) {
      // Erreur déjà formatée par createError
      throw error
    }

    // Erreur inattendue
    console.error('[VerifyResetToken] Unexpected error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Une erreur est survenue lors de la vérification du token',
    })
  }
})
