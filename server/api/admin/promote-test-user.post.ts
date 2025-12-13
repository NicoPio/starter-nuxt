import { getUsersDatabase } from "../../utils/database"
import { z } from 'zod'

const promoteTestUserSchema = z.object({
  email: z.string().email(),
})

export default defineEventHandler(async (event) => {
  // Cette route est uniquement pour les tests E2E
  // En production, elle doit être désactivée ou protégée
  if (process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 403,
      message: 'Cette route est désactivée en production',
    })
  }

  const body = await readBody(event)
  const { email } = promoteTestUserSchema.parse(body)

  const db = getUsersDatabase()

  // Promouvoir l'utilisateur spécifique en Admin
  const updateResult = await db.query(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE email = $2 RETURNING id, name, email, role',
    ['Admin', email]
  )

  if (updateResult.rows.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Utilisateur avec l'email ${email} non trouvé`,
    })
  }

  return {
    message: `Utilisateur ${email} promu Admin avec succès`,
    user: updateResult.rows[0],
  }
})
