import { auth } from "../../../../utils/auth"
import type { UserRole } from "~/types/common.types"

interface SessionUser {
  id: string
  email: string
  name?: string | null
  role?: UserRole
}

interface DatabaseAdapter {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  if (!session || (session.user as SessionUser).role !== 'Admin') {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé - Privilèges administrateur requis',
    })
  }

  const userId = getRouterParam(event, 'id')

  if (userId === session.user.id) {
    throw createError({
      statusCode: 400,
      message: 'Vous ne pouvez pas supprimer votre propre compte',
    })
  }

  const db = auth.options.database as DatabaseAdapter

  // Vérifier si c'est le dernier admin
  const targetUser = await db.query(
    'SELECT role FROM public.user WHERE id = $1',
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
      'SELECT COUNT(*) as count FROM public.user WHERE role = $1',
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
    'DELETE FROM public.user WHERE id = $1 RETURNING id',
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
