import { authClient } from "~/lib/auth-client";

export const useAuth = () => {
  const toast = useToast()
  const { t } = useContentI18n()
  const session = authClient.useSession()

  const user = computed(() => session.value.data?.user || null)
  const isAuthenticated = computed(() => !!session.value.data)

  const signup = async (email: string, password: string, full_name?: string) => {
    try {
      const response = await authClient.signUp.email({
        email,
        password,
        name: full_name || email.split('@')[0] || 'User',
      })

      if (response.error) {
        return { data: null, error: response.error }
      }

      return { data: response.data, error: null }
    } catch (error: unknown) {
      return { data: null, error }
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authClient.signIn.email({
        email,
        password,
      })

      if (response.error) {
        return { data: null, error: response.error }
      }

      return { data: response.data, error: null }
    } catch (error: unknown) {
      return { data: null, error }
    }
  }

  const logout = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: async () => {
            toast.add({
              title: t('auth.logout.success'),
              description: t('auth.logout.successMessage'),
              color: 'success'
            })

            await new Promise(resolve => setTimeout(resolve, 100))

            await navigateTo('/', { replace: true })
          },
          onError: (ctx) => {
            const message = ctx.error?.message || t('auth.logout.errorGeneric')
            toast.add({
              title: t('auth.logout.error'),
              description: message,
              color: 'error'
            })
          }
        }
      })

      return { error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('auth.logout.errorGeneric')
      toast.add({
        title: t('auth.logout.error'),
        description: message,
        color: 'error'
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
    logout
  }
}
