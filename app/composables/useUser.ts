import type { Ref } from 'vue'

interface UserProfile {
  id: string
  email: string
  role: 'Admin' | 'Contributor' | 'User'
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export const useUser = () => {
  const profile: Ref<UserProfile | null> = useState('user-profile', () => null)
  const loading = ref(false)
  const toast = useToast()
  const { t } = useContentI18n()

  const fetchProfile = async () => {
    loading.value = true
    try {
      const data = await $fetch<UserProfile>('/api/users/me')
      profile.value = data
      return { data, error: null }
    } catch (error: any) {
      toast.add({
        title: t('profile.fetch.error'),
        description: error.message || t('profile.fetch.errorGeneric'),
        color: 'red'
      })
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  const updateProfile = async (updates: Partial<Pick<UserProfile, 'full_name' | 'avatar_url'>>) => {
    loading.value = true
    try {
      const data = await $fetch<UserProfile>('/api/users/me', {
        method: 'PATCH',
        body: updates
      })

      profile.value = data

      toast.add({
        title: t('profile.update.success'),
        description: t('profile.update.successMessage'),
        color: 'green'
      })

      return { data, error: null }
    } catch (error: any) {
      toast.add({
        title: t('profile.update.error'),
        description: error.message || t('profile.update.errorGeneric'),
        color: 'red'
      })
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  const isAdmin = computed(() => profile.value?.role === 'Admin')
  const isContributor = computed(() => profile.value?.role === 'Contributor' || profile.value?.role === 'Admin')

  return {
    profile,
    loading,
    fetchProfile,
    updateProfile,
    isAdmin,
    isContributor
  }
}
