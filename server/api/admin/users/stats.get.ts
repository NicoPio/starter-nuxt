import { auth } from "../../../utils/auth"
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

interface RoleStat {
  role: UserRole
  count: number
}

interface UserStatsResponse {
  stats: RoleStat[]
  total: number
}

export default defineEventHandler(async (event): Promise<UserStatsResponse> => {
  // Vérification de la session
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  if (!session) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié',
    })
  }

  // Vérification du rôle
  const userRole = (session.user as SessionUser).role
  if (!userRole || !['Admin', 'Contributor'].includes(userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé - Privilèges admin ou contributor requis',
    })
  }

  const db = auth.options.database as DatabaseAdapter

  // Compter les utilisateurs par rôle
  const query = `
    SELECT role, COUNT(*) as count
    FROM public.user
    GROUP BY role
    ORDER BY role
  `

  const result = await db.query(query, [])

  // Calculer le total
  const stats: RoleStat[] = result.rows.map((row) => ({
    role: row.role as UserRole,
    count: parseInt(String(row.count))
  }))

  const total = stats.reduce((sum, stat) => sum + stat.count, 0)

  return {
    stats,
    total
  }
})
