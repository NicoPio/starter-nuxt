import { ref, computed } from 'vue'
import type { UserWithRole, UserRole, UserListResponse, PaginationMeta, UserFilters } from '~/types/common.types'

export function useUsers() {
  // État réactif
  const users = ref<UserWithRole[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const filters = ref<UserFilters>({
    role: undefined,
    search: undefined
  })

  const { t } = useContentI18n()

  // Computed
  const hasUsers = computed(() => users.value.length > 0)
  const hasPreviousPage = computed(() => pagination.value.page > 1)
  const hasNextPage = computed(() => pagination.value.page < pagination.value.totalPages)

  // Fetch users avec pagination et filtres
  const fetchUsers = async () => {
    loading.value = true
    error.value = null

    try {
      const query: Record<string, string | number> = {
        page: pagination.value.page,
        limit: pagination.value.limit
      }

      if (filters.value.role) {
        query.role = filters.value.role
      }

      if (filters.value.search) {
        query.search = filters.value.search
      }

      console.log('🔍 Fetching users with query:', query)

      const response = await $fetch<UserListResponse>('/api/admin/users', {
        query
      })

      console.log('✅ Received response:', {
        usersCount: response.users.length,
        pagination: response.pagination,
        filters: response.filters
      })

      users.value = response.users
      pagination.value = response.pagination
      filters.value = response.filters
    } catch (err) {
      console.error('❌ Failed to fetch users:', err)
      if (err && typeof err === 'object' && 'statusCode' in err) {
        console.error('   Status:', (err as { statusCode: number }).statusCode)
        console.error('   Message:', (err as { message?: string }).message)
      }
      error.value = t('admin.users.messages.loadError')
    } finally {
      loading.value = false
    }
  }

  // Navigation pagination
  const goToPage = async (page: number) => {
    pagination.value.page = page
    await fetchUsers()
  }

  const nextPage = async () => {
    if (hasNextPage.value) {
      await goToPage(pagination.value.page + 1)
    }
  }

  const previousPage = async () => {
    if (hasPreviousPage.value) {
      await goToPage(pagination.value.page - 1)
    }
  }

  // Filtres
  const setRoleFilter = async (role: UserFilters['role']) => {
    filters.value.role = role
    pagination.value.page = 1 // Reset à la page 1
    await fetchUsers()
  }

  const setSearchFilter = async (search: string | undefined) => {
    filters.value.search = search
    pagination.value.page = 1 // Reset à la page 1
    await fetchUsers()
  }

  const clearFilters = async () => {
    filters.value.role = undefined
    filters.value.search = undefined
    pagination.value.page = 1
    await fetchUsers()
  }

  // Rafraîchir sans changer la page
  const refresh = async () => {
    await fetchUsers()
  }

  // Mettre à jour le rôle d'un utilisateur (avec optimistic update)
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    // Sauvegarder l'état actuel pour rollback
    const originalUsers = [...users.value]

    // Optimistic update
    const userIndex = users.value.findIndex(u => u.id === userId)
    if (userIndex !== -1) {
      const user = users.value[userIndex]
      if (user) {
        users.value[userIndex] = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: newRole,
          createdAt: user.createdAt,
          emailVerified: user.emailVerified,
          image: user.image,
          updatedAt: user.updatedAt
        }
      }
    }

    try {
      await $fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: { role: newRole }
      })

      // Succès - pas besoin de rollback
      return { success: true, error: null }
    } catch (err) {
      // Rollback en cas d'erreur
      users.value = originalUsers
      console.error('Failed to update user role:', err)

      return {
        success: false,
        error: err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : t('admin.users.messages.roleUpdateError')
      }
    }
  }

  // Supprimer un utilisateur (avec optimistic update)
  const deleteUser = async (userId: string) => {
    // Sauvegarder l'état actuel pour rollback
    const originalUsers = [...users.value]
    const originalPagination = { ...pagination.value }

    // Optimistic update - retirer l'utilisateur de la liste
    users.value = users.value.filter(u => u.id !== userId)

    // Mettre à jour le total
    if (pagination.value.total > 0) {
      pagination.value = {
        ...pagination.value,
        total: pagination.value.total - 1,
        totalPages: Math.ceil((pagination.value.total - 1) / pagination.value.limit)
      }
    }

    try {
      await $fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      // Succès - pas besoin de rollback
      return { success: true, error: null }
    } catch (err) {
      // Rollback en cas d'erreur
      users.value = originalUsers
      pagination.value = originalPagination
      console.error('Failed to delete user:', err)

      return {
        success: false,
        error: err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : t('admin.users.messages.deleteError')
      }
    }
  }

  return {
    // État
    users,
    loading,
    error,
    pagination,
    filters,

    // Computed
    hasUsers,
    hasPreviousPage,
    hasNextPage,

    // Actions
    fetchUsers,
    goToPage,
    nextPage,
    previousPage,
    setRoleFilter,
    setSearchFilter,
    clearFilters,
    refresh,
    updateUserRole,
    deleteUser
  }
}
