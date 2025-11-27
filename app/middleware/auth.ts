export default defineNuxtRouteMiddleware(async (to) => {
  const { session } = useAuth()

  // Wait for session to be loaded (handles race condition)
  // The auth.client.ts plugin should have already loaded it
  if (import.meta.client && session.value === undefined) {
    // Session is still loading, wait a bit
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  if (!session.value?.data) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    })
  }
})
