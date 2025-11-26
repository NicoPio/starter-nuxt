export const useAuth = () => {
  const supabaseClient = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()
  const { t } = useContentI18n()

  const isAuthenticated = computed(() => !!user.value)

  const signup = async (email: string, password: string, full_name?: string) => {
    try {
      const response = await $fetch('/api/auth/signup', {
        method: 'POST',
        body: { email, password, full_name }
      })
      return { data: response, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      return { data: response, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST'
      })

      // Clear local session
      await supabaseClient.auth.signOut()

      toast.add({
        title: t('auth.logout.success'),
        description: t('auth.logout.successMessage'),
        color: 'green'
      })

      // Redirect to home
      await navigateTo('/')

      return { error: null }
    } catch (error: any) {
      toast.add({
        title: t('auth.logout.error'),
        description: error.message || t('auth.logout.errorGeneric'),
        color: 'red'
      })
      return { error }
    }
  }

  return {
    user,
    isAuthenticated,
    signup,
    login,
    logout
  }
}
