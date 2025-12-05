<script setup lang="ts">
import type { UserWithRole, UserRole, UserFilters } from '~/types/common.types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'] // T013: Vérifier que 'admin' middleware est bien là
})

const { t } = useContentI18n()
const toast = useToast()

// Utiliser le composable useUsers
const {
  users,
  loading,
  error,
  pagination,
  filters,
  hasUsers,
  hasPreviousPage,
  hasNextPage,
  fetchUsers,
  nextPage,
  previousPage,
  setRoleFilter,
  setSearchFilter,
  clearFilters,
  updateUserRole,
  deleteUser
} = useUsers()

// État du modal d'édition
const editModalOpen = ref(false)
const userToEdit = ref<UserWithRole | null>(null)

// État du dialog de suppression
const deleteDialogOpen = ref(false)
const userToDelete = ref<UserWithRole | null>(null)

// Charger les statistiques de rôles
const roleStats = ref<{ role: UserRole; count: number }[]>([])
const loadingStats = ref(false)

const fetchRoleStats = async () => {
  loadingStats.value = true
  try {
    const response = await $fetch<{ stats: { role: UserRole; count: number }[]; total: number }>('/api/admin/users/stats')
    roleStats.value = response.stats
  } catch (err) {
    console.error('Failed to fetch role stats:', err)
  } finally {
    loadingStats.value = false
  }
}

// Gestionnaire pour mettre à jour les filtres
const handleUpdateFilters = async (newFilters: UserFilters) => {
  if (newFilters.role !== filters.value.role) {
    await setRoleFilter(newFilters.role)
  }
  if (newFilters.search !== filters.value.search) {
    await setSearchFilter(newFilters.search)
  }
}

// Gestionnaire pour réinitialiser les filtres
const handleClearFilters = async () => {
  await clearFilters()
}

// Charger les utilisateurs et statistiques au montage
onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchRoleStats()
  ])
})

// Gestionnaires d'événements pour les actions
const handleEditUser = (user: UserWithRole) => {
  userToEdit.value = user
  editModalOpen.value = true
}

const handleSaveRole = async (userId: string, newRole: UserRole) => {
  const result = await updateUserRole(userId, newRole)

  if (result.success) {
    toast.add({
      title: t('admin.users.messages.roleUpdateSuccess'),
      color: 'success'
    })
    // Rafraîchir les stats
    await fetchRoleStats()
  } else {
    toast.add({
      title: t('admin.users.messages.roleUpdateError'),
      description: result.error || undefined,
      color: 'error'
    })
  }
}

const handleDeleteUser = (user: UserWithRole) => {
  userToDelete.value = user
  deleteDialogOpen.value = true
}

const handleConfirmDelete = async (userId: string) => {
  const result = await deleteUser(userId)

  if (result.success) {
    toast.add({
      title: t('admin.users.messages.deleteSuccess'),
      color: 'success'
    })
    // Rafraîchir les stats après suppression
    await fetchRoleStats()
  } else {
    toast.add({
      title: t('admin.users.messages.deleteError'),
      description: result.error || undefined,
      color: 'error'
    })
  }
}

// Watchers pour réinitialiser les valeurs quand les dialogs se ferment
watch(editModalOpen, (isOpen) => {
  if (!isOpen) {
    userToEdit.value = null
  }
})

watch(deleteDialogOpen, (isOpen) => {
  if (!isOpen) {
    userToDelete.value = null
  }
})

useSeoMeta({
  title: t('admin.users.title') + ' - Admin',
  description: t('admin.users.title')
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- En-tête -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ t('admin.users.title') }}
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Gérez les rôles et les accès des utilisateurs
      </p>
    </div>

    <!-- Erreur -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Erreur"
      :description="error"
      class="mb-6"
    />

    <!-- Card principale -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">{{ t('admin.users.title') }}</h2>
          <UBadge v-if="!loading && hasUsers" color="neutral">
            {{ pagination.total }} utilisateurs
          </UBadge>
        </div>
      </template>

      <!-- Filtres -->
      <div class="mb-6">
        <AdminUserFilters
          :filters="filters"
          :role-stats="roleStats"
          :loading="loading || loadingStats"
          @update-filters="handleUpdateFilters"
          @clear-filters="handleClearFilters"
        />
      </div>

      <!-- Composant UserList -->
      <AdminUserList
        :users="users"
        :loading="loading"
        :page="pagination.page"
        :total-pages="pagination.totalPages"
        :has-previous-page="hasPreviousPage"
        :has-next-page="hasNextPage"
        @previous-page="previousPage"
        @next-page="nextPage"
        @edit-user="handleEditUser"
        @delete-user="handleDeleteUser"
      />
    </UCard>

    <!-- Modal d'édition de rôle -->
    <AdminEditUserModal
      v-model:open="editModalOpen"
      :user="userToEdit"
      @save="handleSaveRole"
    />

    <!-- Dialog de suppression -->
    <AdminDeleteUserDialog
      v-model:open="deleteDialogOpen"
      :user="userToDelete"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>
