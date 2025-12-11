import { requireRole } from "../../../utils/session"
import type { StripeTestConnectionResponse } from "~/app/types/stripe.types"

/**
 * POST /api/admin/stripe/test-connection
 * Teste la connexion à Stripe avec les clés configurées
 * Accès: Admin uniquement
 */
export default defineEventHandler(async (event): Promise<StripeTestConnectionResponse> => {
  // Vérifier que l'utilisateur est Admin
  await requireRole(event, ['Admin'])

  try {
    // Utiliser la fonction de test existante
    const { testStripeConnection } = await import('../../../utils/stripe/client')
    
    const result = await testStripeConnection()

    if (!result.success) {
      return {
        success: false,
        mode: result.mode,
        error: result.error || 'Échec de la connexion à Stripe',
      }
    }

    return {
      success: true,
      mode: result.mode,
      accountId: result.accountId,
    }
  } catch (error: unknown) {
    console.error('[Stripe] Test connection error:', error)
    
    return {
      success: false,
      mode: 'test',
      error: error instanceof Error ? error.message : 'Erreur inconnue lors du test de connexion',
    }
  }
})
