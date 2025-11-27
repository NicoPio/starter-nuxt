import { auth } from "../../utils/auth";

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

  // Return user data from Better-Auth session
  return {
    id: session.user.id,
    email: session.user.email,
    full_name: session.user.name || null,
    avatar_url: session.user.image || null,
    created_at: session.user.createdAt,
    updated_at: session.user.updatedAt,
  };
});
