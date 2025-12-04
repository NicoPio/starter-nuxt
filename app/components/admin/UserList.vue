<script setup lang="ts">
import { h } from 'vue'
import type { UserWithRole } from '~/types/common.types'

defineProps<{
  users: UserWithRole[]
  loading: boolean
  page: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}>()

const emit = defineEmits<{
  previousPage: []
  nextPage: []
  goToPage: [page: number]
  editUser: [user: UserWithRole]
  deleteUser: [user: UserWithRole]
}>()

const { t } = useContentI18n()

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Colonnes du tableau - Nuxt UI v4 utilise TanStack Table avec render functions
// IMPORTANT: Utiliser computed() pour que les traductions se mettent à jour
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns = computed<any[]>(() => [
  {
    accessorKey: 'email',
    header: t('admin.users.email'),
    cell: ({ row }: { row: { original: UserWithRole } }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h(resolveComponent('UAvatar'), {
          src: row.original.image,
          alt: row.original.name || row.original.email,
          size: 'sm'
        }),
        h('span', { class: 'font-medium' }, row.original.email)
      ])
    }
  },
  {
    accessorKey: 'name',
    header: t('admin.users.name'),
    cell: ({ row }: { row: { original: UserWithRole } }) => {
      return h('span', row.original.name || '-')
    }
  },
  {
    accessorKey: 'role',
    header: t('admin.users.role'),
    cell: ({ row }: { row: { original: UserWithRole } }) => {
      const roleColors = {
        'Admin': 'error',
        'Contributor': 'warning',
        'User': 'neutral'
      }
      return h(resolveComponent('UBadge'), {
        color: roleColors[row.original.role as keyof typeof roleColors],
        variant: 'soft'
      }, () => row.original.role)
    }
  },
  {
    accessorKey: 'createdAt',
    header: t('admin.users.createdAt'),
    cell: ({ row }: { row: { original: UserWithRole } }) => {
      return h('span', { class: 'text-sm text-gray-600 dark:text-gray-400' }, formatDate(row.original.createdAt))
    }
  },
  {
    id: 'actions',
    header: t('admin.users.actionsColumn'),
    enableSorting: false,
    cell: ({ row }: { row: { original: UserWithRole } }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h(resolveComponent('UButton'), {
          icon: 'i-heroicons-pencil-square',
          size: 'sm',
          color: 'neutral',
          variant: 'ghost',
          ariaLabel: t('admin.users.actions.edit'),
          onClick: () => emit('editUser', row.original)
        }),
        h(resolveComponent('UButton'), {
          icon: 'i-heroicons-trash',
          size: 'sm',
          color: 'error',
          variant: 'ghost',
          ariaLabel: t('admin.users.actions.delete'),
          onClick: () => emit('deleteUser', row.original)
        })
      ])
    }
  }
])
</script>

<template>
  <div class="space-y-4">
    <!-- État de chargement -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary-500 animate-spin" />
      <span class="ml-3 text-gray-600 dark:text-gray-400">{{ t('admin.users.loading') }}</span>
    </div>

    <!-- Aucun utilisateur -->
    <div v-else-if="users.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-users" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <p class="text-gray-600 dark:text-gray-400">{{ t('admin.users.noUsers') }}</p>
    </div>

    <!-- Tableau des utilisateurs -->
    <div v-else>
      <UTable
        :data="users"
        :columns="columns"
        class="w-full"
      />

      <!-- Pagination -->
      <div class="flex items-center justify-between mt-6">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {{ t('admin.users.pagination.page', { page, total: totalPages }) }}
        </div>

        <div class="flex items-center gap-2">
          <UButton
            icon="i-heroicons-chevron-left"
            :disabled="!hasPreviousPage || loading"
            color="neutral"
            variant="outline"
            @click="emit('previousPage')"
          >
            {{ t('admin.users.pagination.previous') }}
          </UButton>

          <UButton
            icon="i-heroicons-chevron-right"
            trailing
            :disabled="!hasNextPage || loading"
            color="neutral"
            variant="outline"
            @click="emit('nextPage')"
          >
            {{ t('admin.users.pagination.next') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
