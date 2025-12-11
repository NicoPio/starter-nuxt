export default defineNuxtRouteMiddleware(async () => {
  const { loggedIn, user } = useUserSession()

  // Vérifier si l'utilisateur est connecté
  if (!loggedIn.value || !user.value) {
    return navigateTo({
      path: '/login',
      query: {
        error: 'Authentification requise',
        redirect: useRoute().fullPath
      }
    })
  }

  // Vérifier si l'utilisateur est Admin ou Contributor
  if (user.value.role !== 'Admin' && user.value.role !== 'Contributor') {
    return navigateTo({
      path: '/dashboard',
      query: {
        error: 'Accès refusé - Privilèges contributor requis'
      }
    })
  }
})
