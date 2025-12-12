import { z } from 'zod'
import { getUserByEmail } from '../../utils/database/users'
import {
  createPasswordResetToken,
  invalidateAllUserPasswordResetTokens,
  getRecentPasswordResetTokenForUser,
} from '../../utils/database/password-reset-tokens'
import { generatePasswordResetToken, TOKEN_CONFIG, getTokenExpirationDate } from '../../utils/crypto'
import { sendPasswordResetEmail } from '../../utils/email'

// Schéma de validation Zod
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
})

export default defineEventHandler(async (event) => {
  try {
    // 1. Validation des données
    const body = await readBody(event)
    const result = forgotPasswordSchema.safeParse(body)

    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email format',
        message: "L'adresse email fournie n'est pas valide",
      })
    }

    const { email } = result.data

    // 2. Trouver l'utilisateur par email
    const user = await getUserByEmail(email)

    // SÉCURITÉ : Toujours retourner le même message, que l'email existe ou non
    // Cela empêche l'énumération des utilisateurs
    const successResponse = {
      success: true,
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
    }

    // Si l'utilisateur n'existe pas, retourner quand même "success"
    if (!user) {
      console.log('[ForgotPassword] Email not found:', email)
      return successResponse
    }

    // 3. Vérifier le rate limiting (max 1 demande par 5 minutes)
    const recentToken = await getRecentPasswordResetTokenForUser(
      user.id,
      TOKEN_CONFIG.RATE_LIMIT_MS
    )

    if (recentToken) {
      // Rate limit atteint
      console.log('[ForgotPassword] Rate limit hit for user:', user.id)

      // Option A : Retourner une erreur explicite (moins sécurisé, énumération possible)
      // throw createError({
      //   statusCode: 429,
      //   statusMessage: 'Too many requests',
      //   message: 'Veuillez attendre avant de demander un nouveau lien',
      //   data: { retryAfter: 300 }, // 5 minutes
      // })

      // Option B : Retourner "success" mais ne pas envoyer d'email (plus sécurisé)
      // C'est ce que nous faisons ici
      return successResponse
    }

    // 4. Invalider tous les anciens tokens de cet utilisateur
    const invalidatedCount = await invalidateAllUserPasswordResetTokens(user.id)
    console.log('[ForgotPassword] Invalidated old tokens:', invalidatedCount)

    // 5. Générer un nouveau token
    const { token, tokenHash } = generatePasswordResetToken()
    const expiresAt = getTokenExpirationDate()

    // 6. Sauvegarder le token dans la base de données
    const savedToken = await createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    })

    console.log('[ForgotPassword] Token created:', {
      tokenId: savedToken.id,
      userId: user.id,
      expiresAt: savedToken.expires_at,
    })

    // 7. Envoyer l'email avec le lien de réinitialisation
    try {
      await sendPasswordResetEmail(user.email, token)
      console.log('[ForgotPassword] Email sent successfully to:', user.email)
    } catch (emailError) {
      // Log l'erreur mais ne pas la révéler à l'utilisateur (sécurité)
      console.error('[ForgotPassword] Failed to send email:', emailError)

      // En production, on pourrait :
      // - Logger dans un système de monitoring (Sentry, etc.)
      // - Envoyer une alerte à l'équipe technique
      // - Marquer le token comme "email_failed" dans une colonne dédiée

      // Pour l'instant, on retourne quand même "success" pour ne pas révéler l'erreur
      // L'utilisateur ne saura pas si l'email a été envoyé ou non (anti-énumération)
    }

    // 8. Retourner une réponse générique (toujours la même)
    return successResponse
  } catch (error) {
    // Gestion des erreurs
    if (error instanceof Error && 'statusCode' in error) {
      // Erreur déjà formatée par createError
      throw error
    }

    // Erreur inattendue
    console.error('[ForgotPassword] Unexpected error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: "Une erreur est survenue lors de l'envoi de l'email de réinitialisation",
    })
  }
})
