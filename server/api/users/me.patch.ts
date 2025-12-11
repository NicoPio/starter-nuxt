/**
 * Update user profile endpoint for nuxt-auth-utils
 */

import { UpdateProfileSchema } from "../../utils/schemas";

export default defineEventHandler(async (event) => {
  // Get the session from nuxt-auth-utils
  const session = await getUserSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié',
    })
  }

  const body = await readBody(event);

  // Validation avec Zod
  const result = UpdateProfileSchema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Données invalides',
      data: result.error.issues,
    });
  }

  try {
    // Update session with new user data
    await setUserSession(event, {
      user: {
        ...session.user,
        name: result.data.full_name || session.user.name,
      },
      loggedInAt: session.loggedInAt,
    })

    const updatedUser = {
      id: session.user.id,
      email: session.user.email,
      full_name: result.data.full_name || session.user.name || null,
      avatar_url: result.data.avatar_url || null,
      created_at: null, // À récupérer depuis la BD si nécessaire
      updated_at: new Date().toISOString(),
      role: session.user.role || 'User',
    };

    // TODO: Implement actual DB update
    // const db = useDatabase()
    // await db.update(...)

    return updatedUser;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la mise à jour du profil',
    });
  }
});
