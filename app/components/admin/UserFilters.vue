<script setup lang="ts">
import type { UserRole, UserFilters } from '~/types/common.types'

const props = defineProps<{
  filters: UserFilters
  roleStats?: { role: UserRole; count: number }[]
  loading?: boolean
}>()

const emit = defineEmits<{
  updateFilters: [filters: UserFilters]
  clearFilters: []
}>()

const { t } = useContentI18n()

// État local pour les filtres
const localRole = ref<UserRole | undefined>(props.filters.role)
const localSearch = ref<string | undefined>(props.filters.search)

// Options de rôles avec compteurs
const roleOptions = computed(() => {
  const baseOptions: { value: undefined | UserRole; label: string }[] = [
    { value: undefined, label: t('admin.users.filters.allRoles') }
  ]

  const roles: UserRole[] = ['Admin', 'Contributor', 'User']

  roles.forEach(role => {
    // Defensive: ensure roleStats is an array before calling .find()
    const stat = Array.isArray(props.roleStats)
      ? props.roleStats.find(s => s.role === role)
      : undefined
    const count = stat ? ` (${stat.count})` : ''
    baseOptions.push({
      value: role,
      label: t(`admin.users.filters.${role.toLowerCase()}`) + count
    })
  })

  return baseOptions
})

// Appliquer les filtres
const applyFilters = () => {
  emit('updateFilters', {
    role: localRole.value,
    search: localSearch.value
  })
}

// Réinitialiser les filtres
const clearFilters = () => {
  localRole.value = undefined
  localSearch.value = undefined
  emit('clearFilters')
}

// Observer les changements de props pour synchroniser l'état local
watch(() => props.filters, (newFilters) => {
  localRole.value = newFilters.role
  localSearch.value = newFilters.search
}, { deep: true })

// Appliquer automatiquement les filtres quand ils changent
watch([localRole, localSearch], () => {
  applyFilters()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Filtres -->
    <div class="flex flex-col sm:flex-row gap-4">
      <!-- Filtre par rôle -->
      <div class="flex-1">
        <USelect
          v-model="localRole"
          :items="roleOptions"
          value-key="value"
          :loading="loading"
          :placeholder="t('admin.users.filters.allRoles')"
          class="w-full"
        />
      </div>

      <!-- Recherche -->
      <div class="flex-1">
        <UInput
          v-model="localSearch"
          icon="i-heroicons-magnifying-glass"
          :placeholder="t('admin.users.search')"
          :loading="loading"
          class="w-full"
        />
      </div>

      <!-- Bouton de réinitialisation -->
      <UButton
        v-if="localRole || localSearch"
        icon="i-heroicons-x-mark"
        color="neutral"
        variant="outline"
        :disabled="loading"
        @click="clearFilters"
      >
        {{ t('admin.users.filters.clear') }}
      </UButton>
    </div>

    <!-- Indicateur de filtres actifs -->
    <div v-if="localRole || localSearch" class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <UIcon name="i-heroicons-funnel" class="w-4 h-4" />
      <span>
        {{ t('admin.users.filters.active') }}:
        <span v-if="localRole" class="font-medium">{{ t(`admin.users.filters.${localRole.toLowerCase()}`) }}</span>
        <span v-if="localRole && localSearch"> · </span>
        <span v-if="localSearch" class="font-medium">"{{ localSearch }}"</span>
      </span>
    </div>
  </div>
</template>
