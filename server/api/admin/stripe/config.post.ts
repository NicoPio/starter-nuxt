import { requireRole } from "../../../utils/session"
import { getUsersDatabase } from "../../../utils/database"
import { z } from "zod"

// Schéma de validation Zod
const StripeConfigSchema = z.object({
  secretKey: z.string().min(20).startsWith('sk_'),
  publishableKey: z.string().min(20).startsWith('pk_'),
  webhookSecret: z.string().min(20).startsWith('whsec_'),
})

/**
 * POST /api/admin/stripe/config
 * Sauvegarde ou met à jour la configuration Stripe
 * Accès: Admin uniquement
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est Admin
  await requireRole(event, ['Admin'])

  // Validation du body
  const body = await readBody(event)
  const validatedData = StripeConfigSchema.parse(body)

  const { secretKey, publishableKey, webhookSecret } = validatedData

  // Déterminer le mode depuis la clé secrète
  const mode = secretKey.startsWith('sk_live_') ? 'production' : 'test'

  // Chiffrer les clés
  const { encryptApiKey } = await import('../../../utils/stripe/crypto')

  const encryptedSecretKey = encryptApiKey(secretKey)
  const encryptedPublishableKey = encryptApiKey(publishableKey)
  const encryptedWebhookSecret = encryptApiKey(webhookSecret)

  const db = getUsersDatabase()

  // Désactiver les anciennes configurations
  await db.query(
    `UPDATE stripe_configuration SET is_active = false WHERE is_active = true`,
    []
  )

  // Insérer la nouvelle configuration
  await db.query(
    `INSERT INTO stripe_configuration (secret_key, publishable_key, webhook_secret, mode, is_active)
     VALUES ($1, $2, $3, $4, true)`,
    [encryptedSecretKey, encryptedPublishableKey, encryptedWebhookSecret, mode]
  )

  // Réinitialiser le client Stripe pour forcer le rechargement des clés
  const { resetStripeClient } = await import('../../../utils/stripe/client')
  resetStripeClient()

  return {
    success: true,
    mode,
    message: `Configuration Stripe ${mode} sauvegardée avec succès`,
  }
})
