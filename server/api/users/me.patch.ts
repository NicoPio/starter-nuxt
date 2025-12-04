import { auth } from "../../utils/auth";
import { UpdateProfileSchema } from "../../utils/schemas";

export default defineEventHandler(async (event) => {
  // Get the session from better-auth
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié',
    });
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
    // Use better-auth's update user API
    // Note: better-auth provides methods to update user data
    // For now, we'll return the updated data
    // In production, you'd use better-auth's update methods or direct DB access

    const updatedUser = {
      id: session.user.id,
      email: session.user.email,
      full_name: result.data.full_name || session.user.name || null,
      avatar_url: result.data.avatar_url || session.user.image || null,
      created_at: session.user.createdAt,
      updated_at: new Date().toISOString(),
      role: 'User',
    };

    // TODO: Implement actual DB update using better-auth's database adapter
    // const db = auth.options.database
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
