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
  if (!userRole || !['Admin', 'Contributor'].includes(userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé - Privilèges admin ou contributor requis',
    })
  }

  const query = getQuery(event)
  const page = parseInt((query.page as string) || '1')
  const limit = parseInt((query.limit as string) || '10')
  const search = (query.search as string) || ''
  const offset = (page - 1) * limit

  const db = auth.options.database as DatabaseAdapter

  let queryBuilder = 'SELECT id, name, email, "emailVerified", image, role, "createdAt", "updatedAt" FROM public.user WHERE 1=1'
  const params: unknown[] = []

  if (search) {
    params.push(`%${search}%`, `%${search}%`)
    queryBuilder += ` AND (email ILIKE $${params.length - 1} OR name ILIKE $${params.length})`
  }

  const countQuery = `SELECT COUNT(*) as count FROM public.user WHERE 1=1${search ? ' AND (email ILIKE $1 OR name ILIKE $2)' : ''}`
  const countResult = await db.query(countQuery, search ? params : [])
  const total = parseInt(String(countResult.rows[0]?.count || 0))

  params.push(limit, offset)
  queryBuilder += ` ORDER BY "createdAt" DESC LIMIT $${params.length - 1} OFFSET $${params.length}`

  const result = await db.query(queryBuilder, params)

  return {
    users: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }
})
