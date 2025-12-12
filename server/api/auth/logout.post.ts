/**
 * Logout endpoint for nuxt-auth-utils
 * Clears the user session
 */

export default defineEventHandler(async (event) => {
  try {
    // Clear nuxt-auth-utils session
    await clearUserSession(event)

    return {
      success: true,
    }
  } catch (error: unknown) {
    console.error('Logout error:', error)

    throw createError({
      statusCode: 500,
      message: 'An error occurred during logout',
    })
  }
})
