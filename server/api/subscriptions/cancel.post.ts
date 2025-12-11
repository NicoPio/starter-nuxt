import { requireAuth } from "../../utils/session"
import { getUsersDatabase } from "../../utils/database"
import { z } from 'zod'

const cancelSchema = z.object({
  confirm: z.boolean()
})

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est authentifié
  const user = await requireAuth(event)

  const body = await readBody(event)
  const validation = cancelSchema.safeParse(body)

  if (!validation.success || !validation.data.confirm) {
    throw createError({
      statusCode: 400,
      message: 'Confirmation requise',
    })
  }

  const userId = user.id
  const db = getUsersDatabase()

  try {
    const subscriptionResult = await db.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 LIMIT 1',
      [userId]
    )

    if (subscriptionResult.rows.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Abonnement non trouvé',
      })
    }

    const subscription = subscriptionResult.rows[0]
    if (!subscription) {
      throw createError({
        statusCode: 404,
        message: 'Abonnement non trouvé',
      })
    }

    if (subscription.plan_type === 'free') {
      throw createError({
        statusCode: 400,
        message: 'Impossible d\'annuler un abonnement gratuit',
      })
    }

    if (subscription.status === 'cancelled') {
      throw createError({
        statusCode: 400,
        message: 'Abonnement déjà annulé',
      })
    }

    const cancelAt = subscription.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const updateResult = await db.query(
      `UPDATE subscriptions
       SET status = 'cancelled',
           cancel_at = $2,
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING
         id,
         user_id,
         stripe_customer_id,
         stripe_subscription_id,
         plan_type,
         status,
         current_period_start,
         current_period_end,
         cancel_at,
         cancelled_at`,
      [userId, cancelAt]
    )

    return {
      subscription: updateResult.rows[0],
      cancel_at: cancelAt
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    console.error('[API] Error cancelling subscription:', error)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de l\'annulation de l\'abonnement',
    })
  }
})
