/**
 * Get current user endpoint for nuxt-auth-utils
 */

import type { UserRole } from "~/types/common.types"

export default defineEventHandler(async (event) => {
  // Get the session from nuxt-auth-utils
  const session = await getUserSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié',
    })
  }

  // Return user data from nuxt-auth-utils session
  return {
    id: session.user.id,
    email: session.user.email,
    full_name: session.user.name || null,
    avatar_url: null, // nuxt-auth-utils n'a pas d'image par défaut
    role: (session.user.role || 'User') as UserRole,
    created_at: null, // À récupérer depuis la BD si nécessaire
    updated_at: null, // À récupérer depuis la BD si nécessaire
  }
});
