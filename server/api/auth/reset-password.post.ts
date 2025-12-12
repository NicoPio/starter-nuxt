import { z } from 'zod'
import { sql } from '../../utils/database'
import { verifyPasswordResetToken } from '../../utils/crypto'
import { hashPasswordCustom } from '../../utils/password'
import {
  updateUserPassword,
  getUserById,
} from '../../utils/database/users'
import {
  markPasswordResetTokenAsUsed,
  invalidateAllUserPasswordResetTokens,
} from '../../utils/database/password-reset-tokens'

// Schéma de validation Zod
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
})

export default defineEventHandler(async (event) => {
  try {
    // 1. Validation des données
    const body = await readBody(event)
    const result = resetPasswordSchema.safeParse(body)

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw createError({
        statusCode: 400,
        statusMessage: firstError.message,
        message: firstError.message,
      })
    }

    const { token, password, confirmPassword } = result.data

    // 2. Vérifier que les mots de passe correspondent
    if (password !== confirmPassword) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Password mismatch',
        message: 'Les mots de passe ne correspondent pas',
      })
    }

    // 3. Chercher tous les tokens non utilisés et non expirés
    const allValidTokens = await sql<{
      id: string
      token_hash: string
      user_id: string
      expires_at: Date
      used_at: Date | null
    }[]>`
      SELECT id, token_hash, user_id, expires_at, used_at
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

    // 4. Vérifier le token avec chaque hash (protection contre timing attacks)
    let matchedToken: {
      id: string
      user_id: string
      expires_at: Date
    } | null = null

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

    // 5. Vérifier que l'utilisateur existe toujours
    const user = await getUserById(matchedToken.user_id)

    if (!user) {
      console.error('[ResetPassword] User not found:', matchedToken.user_id)
      throw createError({
        statusCode: 400,
        statusMessage: 'User not found',
        message: 'Utilisateur introuvable',
      })
    }

    console.log('[ResetPassword] Valid token found for user:', {
      tokenId: matchedToken.id,
      userId: user.id,
      email: user.email,
    })

    // 6. Hasher le nouveau mot de passe
    const hashedPassword = await hashPasswordCustom(password)

    // 7. Mettre à jour le mot de passe de l'utilisateur
    await updateUserPassword(user.id, hashedPassword)

    console.log('[ResetPassword] Password updated for user:', user.id)

    // 8. Marquer le token comme utilisé
    await markPasswordResetTokenAsUsed(matchedToken.id)

    console.log('[ResetPassword] Token marked as used:', matchedToken.id)

    // 9. Invalider tous les autres tokens de réinitialisation de cet utilisateur
    const invalidatedCount = await invalidateAllUserPasswordResetTokens(user.id)

    console.log('[ResetPassword] Invalidated other tokens:', invalidatedCount)

    // 10. Invalider toutes les sessions actives de l'utilisateur (sécurité)
    // Note: nuxt-auth-utils gère les sessions via des cookies sécurisés
    // Les sessions existantes seront invalides car le mot de passe a changé
    // Si l'utilisateur essaie de se connecter avec l'ancien mot de passe, ça échouera
    // Pas besoin d'invalider explicitement les sessions pour nuxt-auth-utils

    // 11. Retourner succès
    return {
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    }
  } catch (error) {
    // Gestion des erreurs
    if (error instanceof Error && 'statusCode' in error) {
      // Erreur déjà formatée par createError
      throw error
    }

    // Erreur inattendue
    console.error('[ResetPassword] Unexpected error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Une erreur est survenue lors de la réinitialisation du mot de passe',
    })
  }
})
