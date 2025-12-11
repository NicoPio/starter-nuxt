import { requireRole } from "../../../utils/session"

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est Admin
  await requireRole(event, ['Admin'])

  const stripePublicKey = process.env.STRIPE_PUBLIC_KEY || process.env.NUXT_PUBLIC_STRIPE_PUBLIC_KEY || ''
  const isConfigured = !!(process.env.STRIPE_SECRET_KEY && stripePublicKey)
  const isTestMode = stripePublicKey.startsWith('pk_test_')

  return {
    stripe_public_key: stripePublicKey,
    is_test_mode: isTestMode,
    configured: isConfigured
  }
})
