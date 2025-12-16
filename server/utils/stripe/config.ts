import type { StripeMode } from '~/types/stripe.types'
import { decryptApiKey, encryptApiKey, maskApiKey } from './crypto'
import { getActiveStripeConfig, saveStripeConfiguration } from '../database/stripe'

/**
 * Récupère la configuration Stripe active depuis la base de données
 * @returns Configuration Stripe avec clés déchiffrées
 */
export async function getStripeConfig(): Promise<{
  secretKey: string
  publishableKey: string
  webhookSecret: string
  mode: StripeMode
}> {
  const config = await getActiveStripeConfig()

  if (!config) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Stripe not configured',
      data: {
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Please configure Stripe API keys in the admin panel',
      },
    })
  }

  // Déchiffrer les clés
  return {
    secretKey: decryptApiKey(config.secretKey),
    publishableKey: decryptApiKey(config.publishableKey),
    webhookSecret: decryptApiKey(config.webhookSecret),
    mode: config.mode as StripeMode,
  }
}

/**
 * Sauvegarde ou met à jour la configuration Stripe
 * @param secretKey - Clé secrète Stripe
 * @param publishableKey - Clé publique Stripe
 * @param webhookSecret - Secret webhook Stripe
 * @returns Succès de l'opération
 */
export async function saveStripeConfig(
  secretKey: string,
  publishableKey: string,
  webhookSecret: string
): Promise<{ success: boolean }> {
  // Déterminer le mode depuis la clé secrète
  const mode: StripeMode = secretKey.startsWith('sk_live_') ? 'production' : 'test'

  // Chiffrer les clés
  const encryptedSecretKey = encryptApiKey(secretKey)
  const encryptedPublishableKey = encryptApiKey(publishableKey)
  const encryptedWebhookSecret = encryptApiKey(webhookSecret)

  // Sauvegarder dans la base
  await saveStripeConfiguration(
    encryptedSecretKey,
    encryptedPublishableKey,
    encryptedWebhookSecret,
    mode
  )

  // Réinitialiser le client Stripe pour forcer l'utilisation des nouvelles clés
  const { resetStripeClient } = await import('./client')
  resetStripeClient()

  return { success: true }
}

/**
 * Récupère la configuration Stripe pour affichage (clés masquées)
 * @returns Configuration avec clés partiellement masquées
 */
export async function getStripeConfigForDisplay(): Promise<{
  mode: StripeMode
  publishableKey: { masked: string; prefix: string; lastFour: string }
  webhookSecret: { masked: string; prefix: string; lastFour: string }
  isActive: boolean
  updatedAt: Date
}> {
  const config = await getActiveStripeConfig()

  if (!config) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Stripe not configured',
      data: {
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Please configure Stripe API keys in the admin panel',
      },
    })
  }

  // Déchiffrer pour masquer
  const publishableKey = decryptApiKey(config.publishableKey)
  const webhookSecret = decryptApiKey(config.webhookSecret)

  return {
    mode: config.mode as StripeMode,
    publishableKey: maskApiKey(publishableKey),
    webhookSecret: maskApiKey(webhookSecret),
    isActive: config.isActive,
    updatedAt: config.updatedAt,
  }
}

/**
 * Vérifie si Stripe est configuré
 * @returns true si Stripe est configuré avec des clés valides
 */
export async function isStripeConfigured(): Promise<boolean> {
  try {
    await getStripeConfig()
    return true
  } catch {
    return false
  }
}
