import { auth } from "../../../utils/auth"
import { z } from 'zod'
import type { UserRole } from "~/types/common.types"

interface SessionUser {
  id: string
  email: string
  name?: string | null
  role?: UserRole
}

const stripeConfigSchema = z.object({
  stripe_public_key: z.string().min(1).startsWith('pk_'),
  stripe_secret_key: z.string().min(1).startsWith('sk_'),
  webhook_secret: z.string().min(1).startsWith('whsec_'),
  is_test_mode: z.boolean()
})

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

  const body = await readBody(event)
  const validation = stripeConfigSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Données invalides',
      data: validation.error.issues,
    })
  }

  const { stripe_public_key, stripe_secret_key, webhook_secret, is_test_mode } = validation.data

  const modeCheck = stripe_public_key.startsWith('pk_test_') === is_test_mode
  if (!modeCheck) {
    throw createError({
      statusCode: 400,
      message: 'Le mode test/live ne correspond pas aux clés fournies',
    })
  }

  console.log('[Admin] Stripe configuration validation successful')

  const instructions = `
Pour configurer Stripe, ajoutez les clés suivantes dans votre fichier .env :

NUXT_PUBLIC_STRIPE_PUBLIC_KEY=${stripe_public_key}
STRIPE_PUBLIC_KEY=${stripe_public_key}
STRIPE_SECRET_KEY=${stripe_secret_key}
STRIPE_WEBHOOK_SECRET=${webhook_secret}

Puis redémarrez le serveur : npm run dev
  `.trim()

  return {
    success: true,
    message: 'Validation réussie. Configurez les clés manuellement dans .env',
    instructions,
    requires_restart: true,
    keys_validated: {
      public_key: stripe_public_key,
      test_mode: is_test_mode
    }
  }
})
