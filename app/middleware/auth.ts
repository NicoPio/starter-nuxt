// T012 & T036: Authentication middleware with redirect preservation
export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()

  // If user is not authenticated, redirect to login with original URL
  if (!user.value) {
    // Preserve the original URL as redirect parameter
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    })
  }
})
