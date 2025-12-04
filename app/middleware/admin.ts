export default defineNuxtRouteMiddleware(async () => {
  const { isAdmin } = useRole()

  if (!isAdmin.value) {
    return navigateTo({
      path: '/dashboard',
      query: {
        error: 'Accès refusé - Privilèges administrateur requis'
      }
    })
  }
})
