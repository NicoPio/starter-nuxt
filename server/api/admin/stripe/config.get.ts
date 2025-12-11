import { requireRole } from "../../../utils/session"
import { getUsersDatabase } from "../../../utils/database"
import type { StripeConfigResponse } from "~/app/types/stripe.types"

/**
 * GET /api/admin/stripe/config
 * Récupère la configuration Stripe actuelle (clés masquées)
 * Accès: Admin uniquement
 */
export default defineEventHandler(async (event): Promise<StripeConfigResponse | null> => {
  // Vérifier que l'utilisateur est Admin
  await requireRole(event, ['Admin'])

  const db = getUsersDatabase()

  // Récupérer la configuration active
  const result = await db.query(
    `SELECT mode, publishable_key, webhook_secret, is_active, updated_at
     FROM stripe_configuration
     WHERE is_active = true
     ORDER BY updated_at DESC
     LIMIT 1`,
    []
  )

  if (result.rows.length === 0) {
    return null
  }

  const config = result.rows[0]

  // Déchiffrer et masquer les clés pour l'affichage
  const { decryptApiKey } = await import('../../../utils/stripe/crypto')
  
  const publishableKey = decryptApiKey(String(config.publishable_key))
  const webhookSecret = decryptApiKey(String(config.webhook_secret))

  // Masquer partiellement les clés (afficher seulement prefix et 4 derniers chars)
  const maskKey = (key: string): string => {
    if (key.length <= 8) return '••••••••'
    const prefix = key.substring(0, 7) // ex: "pk_test" ou "sk_test"
    const lastFour = key.substring(key.length - 4)
    return `${prefix}••••••••••••${lastFour}`
  }

  return {
    mode: String(config.mode) as 'test' | 'production',
    publishableKey: maskKey(publishableKey),
    webhookSecret: maskKey(webhookSecret),
    isActive: Boolean(config.is_active),
    updatedAt: String(config.updated_at),
  }
})
