import { requireAuth } from "../../utils/session"
import { getUsersDatabase } from "../../utils/database"

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est authentifié
  const user = await requireAuth(event)

  const userId = user.id
  const db = getUsersDatabase()

  try {
    const result = await db.query(
      `SELECT
        id,
        user_id,
        stripe_customer_id,
        stripe_subscription_id,
        plan_type,
        status,
        current_period_start,
        current_period_end,
        cancel_at,
        cancelled_at,
        created_at,
        updated_at
      FROM subscriptions
      WHERE user_id = $1
      LIMIT 1`,
      [userId]
    )

    if (result.rows.length === 0) {
      const createResult = await db.query(
        `INSERT INTO subscriptions (user_id, stripe_customer_id, plan_type, status)
         VALUES ($1, '', 'free', 'active')
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
           cancelled_at,
           created_at,
           updated_at`,
        [userId]
      )

      return createResult.rows[0]
    }

    return result.rows[0]
  } catch (error: unknown) {
    console.error('[API] Error fetching subscription:', error)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la récupération de l\'abonnement',
    })
  }
})
