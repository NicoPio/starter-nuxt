import type { H3Event } from 'h3'
import type { UserRole } from '~/app/types/common.types'

/**
 * Require user to have one of the specified roles
 * Throws 401 if not authenticated, 403 if insufficient permissions
 *
 * @param event - H3 event object
 * @param allowedRoles - Array of roles that can access this resource
 * @returns User object if authorized
 *
 * @example
 * // In an API endpoint
 * export default defineEventHandler(async (event) => {
 *   const user = await requireRole(event, ['Admin', 'Contributor'])
 *   // ... rest of endpoint logic
 * })
 */
export async function requireRole(event: H3Event, allowedRoles: UserRole[]) {
  const session = await getUserSession(event)

  // Check if user is authenticated
  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  // Check if user has required role
  const userRole = session.user.role as UserRole
  if (!allowedRoles.includes(userRole)) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions'
    })
  }

  return session.user
}

/**
 * Check if user is authenticated
 * Throws 401 if not authenticated
 *
 * @param event - H3 event object
 * @returns User object if authenticated
 */
export async function requireAuth(event: H3Event) {
  const session = await getUserSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  return session.user
}

/**
 * Get current user session (optional)
 * Returns null if not authenticated
 *
 * @param event - H3 event object
 * @returns User object or null
 */
export async function getOptionalUser(event: H3Event) {
  const session = await getUserSession(event)
  return session.user || null
}
