/**
 * Guest middleware - redirects authenticated users to dashboard
 * Uses nuxt-auth-utils session
 */

export default defineNuxtRouteMiddleware(async () => {
  const { loggedIn, user } = useUserSession()

  // If user is authenticated, redirect to dashboard
  if (loggedIn.value && user.value) {
    return navigateTo('/dashboard')
  }
})
