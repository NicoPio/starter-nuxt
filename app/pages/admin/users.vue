<script setup lang="ts">
import type { UserWithRole, UsersResponse } from '~/types/common.types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'contributor']
})

const { isAdmin, isContributor } = useRole()

const { data: users, pending, refresh } = await useFetch<UsersResponse>('/api/admin/users', {
  query: {
    page: 1,
    limit: 20
  }
})

const selectedUser = ref<UserWithRole | null>(null)
const showRoleDialog = ref(false)
const showDeleteDialog = ref(false)

const openRoleDialog = (user: UserWithRole) => {
  selectedUser.value = user
  showRoleDialog.value = true
}

const openDeleteDialog = (user: UserWithRole) => {
  selectedUser.value = user
  showDeleteDialog.value = true
}

const updateRole = async (newRole: string) => {
  if (!selectedUser.value) return

  try {
    await $fetch(`/api/admin/users/${selectedUser.value.id}/role`, {
      method: 'PATCH',
      body: { role: newRole }
    })

    await refresh()
    showRoleDialog.value = false

    useToast().add({
      title: 'Rôle mis à jour',
      description: `Le rôle de ${selectedUser.value.email} a été changé en ${newRole}`,
      color: 'success'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Impossible de mettre à jour le rôle'
    useToast().add({
      title: 'Erreur',
      description: message,
      color: 'error'
    })
  }
}

const deleteUser = async () => {
  if (!selectedUser.value) return

  try {
    await $fetch(`/api/admin/users/${selectedUser.value.id}`, {
      method: 'DELETE'
    })

    await refresh()
    showDeleteDialog.value = false

    useToast().add({
      title: 'Utilisateur supprimé',
      description: `L'utilisateur ${selectedUser.value.email} a été supprimé`,
      color: 'success'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Impossible de supprimer l\'utilisateur'
    useToast().add({
      title: 'Erreur',
      description: message,
      color: 'error'
    })
  }
}

useSeoMeta({
  title: 'Gestion des utilisateurs - Admin',
  description: 'Administration des utilisateurs et des rôles'
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <div class="flex items-center gap-3">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Gestion des utilisateurs
        </h1>
        <UBadge v-if="isContributor" color="warning" variant="subtle">
          Mode lecture seule
        </UBadge>
      </div>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        <span v-if="isAdmin">Gérez les rôles et les accès des utilisateurs</span>
        <span v-else-if="isContributor">Consultez la liste des utilisateurs (accès en lecture seule)</span>
      </p>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Liste des utilisateurs</h2>
          <UBadge v-if="users" color="neutral">
            {{ users.pagination.total }} utilisateurs
          </UBadge>
        </div>
      </template>

      <div v-if="pending" class="flex justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin" />
      </div>

      <div v-else-if="users?.users && users.users.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Utilisateur
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rôle
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Inscription
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="user in users?.users || []" :key="user.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ user.name || 'Sans nom' }}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {{ user.email }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <UBadge
                  :color="user.role === 'Admin' ? 'error' : user.role === 'Contributor' ? 'warning' : 'neutral'"
                >
                  {{ user.role }}
                </UBadge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ new Date(user.createdAt).toLocaleDateString('fr-FR') }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div v-if="isAdmin" class="flex justify-end gap-2">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="outline"
                    @click="openRoleDialog(user)"
                  >
                    Changer le rôle
                  </UButton>
                  <UButton
                    size="xs"
                    color="error"
                    variant="outline"
                    @click="openDeleteDialog(user)"
                  >
                    Supprimer
                  </UButton>
                </div>
                <div v-else-if="isContributor" class="text-xs text-gray-500 dark:text-gray-400">
                  Lecture seule
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
        Aucun utilisateur trouvé
      </div>
    </UCard>

    <UModal v-model="showRoleDialog">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Changer le rôle</h3>
        </template>

        <div v-if="selectedUser" class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Utilisateur: <strong>{{ selectedUser.email }}</strong>
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Rôle actuel: <strong>{{ selectedUser.role }}</strong>
          </p>

          <div class="space-y-2">
            <UButton
              block
              :color="selectedUser.role === 'Admin' ? 'primary' : 'neutral'"
              @click="updateRole('Admin')"
            >
              Admin - Accès complet
            </UButton>
            <UButton
              block
              :color="selectedUser.role === 'Contributor' ? 'primary' : 'neutral'"
              @click="updateRole('Contributor')"
            >
              Contributor - Lecture seule
            </UButton>
            <UButton
              block
              :color="selectedUser.role === 'User' ? 'primary' : 'neutral'"
              @click="updateRole('User')"
            >
              User - Utilisateur standard
            </UButton>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton color="neutral" variant="outline" @click="showRoleDialog = false">
              Annuler
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <UModal v-model="showDeleteDialog">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-error">Supprimer l'utilisateur</h3>
        </template>

        <div v-if="selectedUser" class="space-y-4">
          <p class="text-sm">
            Êtes-vous sûr de vouloir supprimer <strong>{{ selectedUser.email }}</strong> ?
          </p>
          <p class="text-sm text-error">
            Cette action est irréversible.
          </p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="outline" @click="showDeleteDialog = false">
              Annuler
            </UButton>
            <UButton color="error" @click="deleteUser">
              Supprimer
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
