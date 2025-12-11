/**
 * Auth composable for nuxt-auth-utils
 * Replaces Better Auth authClient
 */

export const useAuth = () => {
  const toast = useToast()
  const { t } = useContentI18n()

  // Use nuxt-auth-utils session
  const { loggedIn, user, session, fetch: refreshSession, clear } = useUserSession()

  const isAuthenticated = computed(() => loggedIn.value)

  const signup = async (email: string, password: string, full_name?: string) => {
    try {
      const response = await $fetch('/api/auth/register', {
        method: 'POST',
        body: {
          email,
          password,
          name: full_name || email.split('@')[0] || 'User',
        },
      })

      // Refresh session after signup
      await refreshSession()

      return { data: response, error: null }
    } catch (error: unknown) {
      console.error('Signup error:', error)
      return { data: null, error }
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await $fetch('/api/auth/login', {
        method: 'POST',
        body: {
          email,
          password,
        },
      })

      // Refresh session after login
      await refreshSession()

      return { data: response, error: null }
    } catch (error: unknown) {
      console.error('Login error:', error)
      return { data: null, error }
    }
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
      })

      // Clear local session
      await clear()

      toast.add({
        title: t('auth.logout.success'),
        description: t('auth.logout.successMessage'),
        color: 'success',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))
      await navigateTo('/', { replace: true })

      return { error: null }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t('auth.logout.errorGeneric')
      toast.add({
        title: t('auth.logout.error'),
        description: message,
        color: 'error',
      })
      return { error }
    }
  }

  return {
    user,
    session,
    isAuthenticated,
    signup,
    login,
    logout,
  }
}
