import Stripe from 'stripe'
import { getStripeConfig } from './config'

let stripeInstance: Stripe | null = null
let currentSecretKey: string | null = null

/**
 * Récupère ou crée une instance du client Stripe (pattern singleton)
 * @param apiKey - Clé API Stripe optionnelle (sinon chargée depuis la config)
 * @returns Instance Stripe configurée
 */
export async function getStripeClient(apiKey?: string): Promise<Stripe> {
  let key = apiKey

  // Si pas de clé fournie, charger depuis la config
  if (!key) {
    try {
      const config = await getStripeConfig()
      key = config.secretKey
    } catch {
      // Fallback sur la variable d'environnement
      const runtimeConfig = useRuntimeConfig()
      key = runtimeConfig.stripe.secretKey
    }
  }

  if (!key) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Stripe API key not configured',
      data: {
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Please configure Stripe API keys in the admin panel or environment variables',
      },
    })
  }

  // Réutiliser l'instance existante si la clé est identique
  if (stripeInstance && currentSecretKey === key) {
    return stripeInstance
  }

  // Créer une nouvelle instance Stripe
  stripeInstance = new Stripe(key, {
    apiVersion: '2024-12-18.acacia', // Version API Stripe
    maxNetworkRetries: 2,
    timeout: 30000,
    telemetry: true,
  })

  currentSecretKey = key

  return stripeInstance
}

/**
 * Réinitialise le client Stripe (force la création d'une nouvelle instance)
 * Utile après changement de clés API par l'admin
 */
export function resetStripeClient(): void {
  stripeInstance = null
  currentSecretKey = null
}

/**
 * Teste la connexion à Stripe avec les clés actuelles
 * @returns Objet avec succès, mode et accountId si réussi
 */
export async function testStripeConnection(): Promise<{
  success: boolean
  mode: 'test' | 'production'
  accountId?: string
  error?: string
}> {
  try {
    const stripe = await getStripeClient()

    // Récupérer les informations du compte pour tester la connexion
    const account = await stripe.accounts.retrieve()

    // Déterminer le mode (test vs production) depuis la clé
    const key = currentSecretKey || ''
    const mode = key.startsWith('sk_test_') ? 'test' : 'production'

    return {
      success: true,
      mode,
      accountId: account.id,
    }
  } catch (error: unknown) {
    console.error('[Stripe] Connection test failed:', error)

    return {
      success: false,
      mode: 'test',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
