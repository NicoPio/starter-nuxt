import { requireRole } from "../../../../utils/session"
import { getUsersDatabase } from "../../../../utils/database"
import type { UserRole } from "~/types/common.types"

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est Admin
  const user = await requireRole(event, ['Admin'])

  const userId = getRouterParam(event, 'id')

  if (userId === user.id) {
    throw createError({
      statusCode: 400,
      message: 'Vous ne pouvez pas supprimer votre propre compte',
    })
  }

  const db = getUsersDatabase()

  // Vérifier si c'est le dernier admin
  const targetUser = await db.query(
    'SELECT role FROM users WHERE id = $1',
    [userId]
  )

  if (targetUser.rows.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Utilisateur non trouvé',
    })
  }

  // Si l'utilisateur à supprimer est Admin, vérifier qu'il n'est pas le dernier
  if ((targetUser.rows[0] as { role: UserRole }).role === 'Admin') {
    const adminCount = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE role = $1',
      ['Admin']
    )

    const count = parseInt(String((adminCount.rows[0] as { count: number }).count))

    if (count <= 1) {
      throw createError({
        statusCode: 400,
        message: 'Impossible de supprimer le dernier administrateur',
      })
    }
  }

  const result = await db.query(
    'DELETE FROM users WHERE id = $1 RETURNING id',
    [userId]
  )

  if (result.rows.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Utilisateur non trouvé',
    })
  }

  return {
    message: 'Utilisateur supprimé avec succès'
  }
})
