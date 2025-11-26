// T013: Guest middleware (redirect authenticated users)
export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()

  // If user is authenticated, redirect to dashboard
  if (user.value) {
    return navigateTo('/dashboard')
  }
})
