/**
 * Auth middleware - requires user to be authenticated
 * Uses nuxt-auth-utils session
 */

export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, user } = useUserSession()

  // Check if user is authenticated
  if (!loggedIn.value || !user.value) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    })
  }
})
