<script setup lang="ts">
import type { UserWithRole } from '~/types/common.types'

const props = defineProps<{
  user: UserWithRole | null
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [userId: string]
}>()

const { t } = useContentI18n()

// Computed writable pour synchroniser v-model:open avec la prop
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

// Confirmer la suppression
const handleConfirm = () => {
  if (!props.user) return
  emit('confirm', props.user.id)
  isOpen.value = false
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="t('admin.users.deleteDialog.title')"
    :ui="{ footer: 'flex items-center justify-end gap-3' }"
  >
    <template #body>
      <div v-if="user" class="space-y-4">
        <!-- Message de confirmation -->
        <p class="text-gray-700 dark:text-gray-300">
          {{ t('admin.users.deleteDialog.message') }}
        </p>

        <!-- Info utilisateur à supprimer -->
        <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <UAvatar
            v-if="user.image"
            :src="user.image"
            :alt="user.name || user.email"
            size="md"
          />
          <UAvatar
            v-else
            :alt="user.name || user.email"
            size="md"
          />
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ user.name || user.email }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400 truncate">{{ user.email }}</p>
            <UBadge :color="user.role === 'Admin' ? 'error' : user.role === 'Contributor' ? 'warning' : 'neutral'" variant="soft" size="sm" class="mt-1">
              {{ user.role }}
            </UBadge>
          </div>
        </div>

        <!-- Avertissement -->
        <UAlert
          color="error"
          variant="soft"
          :title="t('admin.users.deleteDialog.warning')"
          :description="t('admin.users.deleteDialog.warningMessage')"
        />
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        color="neutral"
        variant="outline"
        @click="close"
      >
        {{ t('admin.users.deleteDialog.cancel') }}
      </UButton>
      <UButton
        color="error"
        @click="handleConfirm"
      >
        {{ t('admin.users.deleteDialog.confirm') }}
      </UButton>
    </template>
  </UModal>
</template>
