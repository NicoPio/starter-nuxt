import { requireRole } from "../../../../utils/session"
import { getUsersDatabase } from "../../../../utils/database"
import { z } from 'zod'

const updateRoleSchema = z.object({
  role: z.enum(['Admin', 'Contributor', 'User'])
})

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est Admin
  const user = await requireRole(event, ['Admin'])

  const userId = getRouterParam(event, 'id')
  const body = await readBody(event)

  const validation = updateRoleSchema.safeParse(body)
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Données invalides',
      data: validation.error.issues,
    })
  }

  const { role } = validation.data

  if (userId === user.id && role !== 'Admin') {
    throw createError({
      statusCode: 400,
      message: 'Vous ne pouvez pas retirer vos propres privilèges administrateur',
    })
  }

  const db = getUsersDatabase()

  const result = await db.query(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role',
    [role, userId]
  )

  if (result.rows.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Utilisateur non trouvé',
    })
  }

  return {
    user: result.rows[0],
    message: 'Rôle mis à jour avec succès'
  }
})
