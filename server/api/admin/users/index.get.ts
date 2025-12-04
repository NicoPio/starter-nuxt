import { auth } from "../../../utils/auth"
import { UserListQuerySchema } from "../../../utils/validation"
import type { UserRole, UserListResponse } from "~/types/common.types"

interface SessionUser {
  id: string
  email: string
  name?: string | null
  role?: UserRole
}

interface DatabaseAdapter {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

export default defineEventHandler(async (event): Promise<UserListResponse> => {
  console.log('🔍 [API] /admin/users - Request received')

  // Vérification de la session
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  console.log('🔍 [API] Session:', session ? 'Found' : 'Not found')

  if (!session) {
    console.log('❌ [API] No session found, returning 401')
    throw createError({
      statusCode: 401,
      message: 'Non authentifié',
    })
  }

  // Vérification du rôle
  const userRole = (session.user as SessionUser).role
  console.log('🔍 [API] User role:', userRole, 'User:', (session.user as SessionUser).email)

  if (!userRole || !['Admin', 'Contributor'].includes(userRole)) {
    console.log('❌ [API] Insufficient privileges, returning 403')
    throw createError({
      statusCode: 403,
      message: 'Accès refusé - Privilèges admin ou contributor requis',
    })
  }

  // Validation des query params avec Zod
  const query = getQuery(event)
  const validatedQuery = UserListQuerySchema.parse({
    page: query.page || 1,
    limit: query.limit || 20,
    role: query.role,
    search: query.search
  })

  const { page, limit, role, search } = validatedQuery
  const offset = (page - 1) * limit

  const db = auth.options.database as DatabaseAdapter

  // Construction de la requête SQL dynamique
  let queryBuilder = 'SELECT id, name, email, "emailVerified", image, role, "createdAt", "updatedAt" FROM public.user WHERE 1=1'
  const params: unknown[] = []
  let paramIndex = 1

  // Filtre par rôle (T005)
  if (role) {
    params.push(role)
    queryBuilder += ` AND role = $${paramIndex++}`
  }

  // Filtre par recherche (T006)
  if (search) {
    params.push(`%${search}%`, `%${search}%`)
    queryBuilder += ` AND (email ILIKE $${paramIndex++} OR name ILIKE $${paramIndex++})`
  }

  // Comptage total pour pagination
  let countQuery = 'SELECT COUNT(*) as count FROM public.user WHERE 1=1'
  const countParams: unknown[] = []
  let countParamIndex = 1

  if (role) {
    countParams.push(role)
    countQuery += ` AND role = $${countParamIndex++}`
  }

  if (search) {
    countParams.push(`%${search}%`, `%${search}%`)
    countQuery += ` AND (email ILIKE $${countParamIndex++} OR name ILIKE $${countParamIndex++})`
  }

  const countResult = await db.query(countQuery, countParams)
  const total = parseInt(String(countResult.rows[0]?.count || 0))
  console.log('🔍 [API] Total users in database:', total)

  // Ajout de la pagination
  params.push(limit, offset)
  queryBuilder += ` ORDER BY "createdAt" DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`

  console.log('🔍 [API] Executing query with params:', { limit, offset })
  const result = await db.query(queryBuilder, params)
  console.log('✅ [API] Query returned', result.rows.length, 'users')

  // Retour au format UserListResponse
  return {
    users: result.rows.map((row) => ({
      id: String(row.id),
      email: String(row.email),
      name: row.name ? String(row.name) : null,
      role: row.role as UserRole,
      emailVerified: Boolean(row.emailVerified),
      image: row.image ? String(row.image) : null,
      createdAt: String(row.createdAt),
      updatedAt: row.updatedAt ? String(row.updatedAt) : undefined,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters: {
      role,
      search,
    }
  }
})
