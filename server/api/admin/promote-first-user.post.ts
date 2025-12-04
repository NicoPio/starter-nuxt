import { auth } from "../../utils/auth"

interface DatabaseAdapter {
  query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

export default defineEventHandler(async () => {
  const db = auth.options.database as DatabaseAdapter

  const result = await db.query(
    'SELECT COUNT(*) as count FROM public.user WHERE role = $1',
    ['Admin']
  )

  const adminCount = parseInt(String(result.rows[0]?.count || 0))

  if (adminCount > 0) {
    return {
      message: 'Un administrateur existe déjà',
      promoted: false
    }
  }

  const updateResult = await db.query(
    'UPDATE public.user SET role = $1, "updatedAt" = NOW() WHERE id = (SELECT id FROM public.user ORDER BY "createdAt" LIMIT 1) RETURNING id, name, email, role',
    ['Admin']
  )

  if (updateResult.rows.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Aucun utilisateur trouvé'
    })
  }

  return {
    message: 'Premier utilisateur promu Admin avec succès',
    user: updateResult.rows[0],
    promoted: true
  }
})
