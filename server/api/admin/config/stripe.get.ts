import { auth } from "../../../utils/auth"
import type { UserRole } from "~/types/common.types"

interface SessionUser {
  id: string
  email: string
  name?: string | null
  role?: UserRole
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  if (!session) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié',
    })
  }

  const userRole = (session.user as SessionUser).role
  if (userRole !== 'Admin') {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé - Privilèges administrateur requis',
    })
  }

  const stripePublicKey = process.env.STRIPE_PUBLIC_KEY || process.env.NUXT_PUBLIC_STRIPE_PUBLIC_KEY || ''
  const isConfigured = !!(process.env.STRIPE_SECRET_KEY && stripePublicKey)
  const isTestMode = stripePublicKey.startsWith('pk_test_')

  return {
    stripe_public_key: stripePublicKey,
    is_test_mode: isTestMode,
    configured: isConfigured
  }
})
