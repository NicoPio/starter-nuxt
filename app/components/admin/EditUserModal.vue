<script setup lang="ts">
import type { UserWithRole, UserRole } from '~/types/common.types'

const props = defineProps<{
  user: UserWithRole | null
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [userId: string, newRole: UserRole]
}>()

const { t } = useContentI18n()

// Computed writable pour synchroniser v-model:open avec la prop
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

// État local pour le rôle sélectionné
const selectedRole = ref<UserRole | undefined>(props.user?.role)

// Options de rôles disponibles
const roleOptions: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'Admin',
    label: 'Admin',
    description: t('admin.users.roles.adminDescription')
  },
  {
    value: 'Contributor',
    label: 'Contributor',
    description: t('admin.users.roles.contributorDescription')
  },
  {
    value: 'User',
    label: 'User',
    description: t('admin.users.roles.userDescription')
  }
]

// Observer les changements de l'utilisateur
watch(() => props.user, (newUser) => {
  if (newUser) {
    selectedRole.value = newUser.role
  }
}, { immediate: true })

// Sauvegarder le changement de rôle
const handleSave = () => {
  if (!props.user || !selectedRole.value) return

  if (selectedRole.value === props.user.role) {
    // Pas de changement, juste fermer
    isOpen.value = false
    return
  }

  emit('save', props.user.id, selectedRole.value)
  isOpen.value = false
}

// Vérifier si le rôle a changé
const hasChanged = computed(() => {
  return selectedRole.value !== props.user?.role
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="t('admin.users.editRole.title')"
    :description="t('admin.users.editRole.selectRole')"
    :ui="{ footer: 'flex items-center justify-end gap-3' }"
  >
    <template #body>
      <div v-if="user" class="space-y-6">
        <!-- Info utilisateur -->
        <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UAvatar
            v-if="user.image"
            :src="user.image"
            :alt="user.name || user.email"
            size="lg"
          />
          <UAvatar
            v-else
            :alt="user.name || user.email"
            size="lg"
          />
          <div>
            <p class="font-medium">{{ user.name || user.email }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ user.email }}</p>
          </div>
        </div>

        <!-- Sélecteur de rôle -->
        <div class="space-y-3">
          <label class="block text-sm font-medium">
            {{ t('admin.users.editRole.selectRole') }}
          </label>

          <div class="space-y-2">
            <div
              v-for="option in roleOptions"
              :key="option.value"
              class="relative flex items-start p-4 border rounded-lg cursor-pointer transition-all"
              :class="[
                selectedRole === option.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              ]"
              @click="selectedRole = option.value"
            >
              <div class="flex items-center h-5">
                <input
                  :id="`role-${option.value}`"
                  v-model="selectedRole"
                  :value="option.value"
                  type="radio"
                  class="h-4 w-4 text-primary-600 focus:ring-primary-500"
                >
              </div>
              <div class="ml-3">
                <label
                  :for="`role-${option.value}`"
                  class="block text-sm font-medium cursor-pointer"
                >
                  {{ option.label }}
                </label>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ option.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Avertissement si changement -->
        <UAlert
          v-if="hasChanged"
          color="warning"
          variant="soft"
          :title="t('admin.users.editRole.warning')"
          :description="t('admin.users.editRole.warningMessage')"
        />
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        color="neutral"
        variant="outline"
        @click="close"
      >
        {{ t('admin.users.editRole.cancel') }}
      </UButton>
      <UButton
        color="primary"
        :disabled="!hasChanged"
        @click="handleSave"
      >
        {{ t('admin.users.editRole.save') }}
      </UButton>
    </template>
  </UModal>
</template>
