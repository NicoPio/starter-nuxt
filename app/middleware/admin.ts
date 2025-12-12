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

  // Vérifier si l'utilisateur est Admin
  if (user.value.role !== 'Admin') {
    return navigateTo({
      path: '/dashboard',
      query: {
        error: 'Accès refusé - Privilèges administrateur requis'
      }
    })
  }
})
