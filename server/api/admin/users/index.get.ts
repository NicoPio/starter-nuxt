import { requireRole } from "../../../utils/session"
import { UserListQuerySchema } from "../../../utils/validation"
import type { UserRole, UserListResponse } from "~/types/common.types"
import { getUsersDatabase } from "../../../utils/database"

export default defineEventHandler(async (event): Promise<UserListResponse> => {
  console.log('🔍 [API] /admin/users - Request received')

  // Vérification de la session et du rôle (Admin ou Contributor)
  await requireRole(event, ['Admin', 'Contributor'])
  console.log('✅ [API] User authorized')

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

  const db = getUsersDatabase()

  // Construction de la requête SQL dynamique
  let queryBuilder = 'SELECT id, name, email, email_verified, image, role, created_at, updated_at FROM users WHERE 1=1'
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
  let countQuery = 'SELECT COUNT(*) as count FROM users WHERE 1=1'
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
  queryBuilder += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`

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
      emailVerified: Boolean(row.email_verified),
      image: row.image ? String(row.image) : null,
      createdAt: String(row.created_at),
      updatedAt: row.updated_at ? String(row.updated_at) : undefined,
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
