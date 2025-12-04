<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const { t } = useContentI18n()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleConfirm = () => {
  emit('confirm')
}
</script>

<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-error-100 dark:bg-error-900/20">
            <UIcon name="i-heroicons-exclamation-triangle" class="h-6 w-6 text-error-600 dark:text-error-400" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('subscription.cancel.title') }}
          </h3>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ t('subscription.cancel.confirmation') }}
        </p>

        <div class="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <div class="flex gap-3">
            <UIcon name="i-heroicons-information-circle" class="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-yellow-800 dark:text-yellow-200">
              <p class="font-medium mb-1">{{ t('subscription.cancel.warning') }}</p>
              <ul class="list-disc list-inside space-y-1 text-yellow-700 dark:text-yellow-300">
                <li>{{ t('subscription.cancel.warningPoint1') }}</li>
                <li>{{ t('subscription.cancel.warningPoint2') }}</li>
                <li>{{ t('subscription.cancel.warningPoint3') }}</li>
              </ul>
            </div>
          </div>
        </div>

        <p class="text-sm font-medium text-gray-900 dark:text-white">
          {{ t('subscription.cancel.question') }}
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="loading"
            @click="isOpen = false"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="error"
            :loading="loading"
            @click="handleConfirm"
          >
            {{ t('subscription.cancel.confirmButton') }}
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
