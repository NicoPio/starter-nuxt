export default defineNuxtRouteMiddleware(async () => {
  const { hasPermission } = useRole()

  if (!hasPermission(['Admin', 'Contributor'])) {
    return navigateTo({
      path: '/dashboard',
      query: {
        error: 'Accès refusé - Privilèges contributor requis'
      }
    })
  }
})
