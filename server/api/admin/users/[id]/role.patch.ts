import { auth } from "../../../../utils/auth"
import { z } from 'zod'
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

const updateRoleSchema = z.object({
  role: z.enum(['Admin', 'Contributor', 'User'])
})

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

  if (userId === session.user.id && role !== 'Admin') {
    throw createError({
      statusCode: 400,
      message: 'Vous ne pouvez pas retirer vos propres privilèges administrateur',
    })
  }

  const db = auth.options.database as DatabaseAdapter

  const result = await db.query(
    'UPDATE public.user SET role = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING id, name, email, role',
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
