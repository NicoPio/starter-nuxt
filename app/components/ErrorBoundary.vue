<script setup lang="ts">
import { ref, onErrorCaptured, computed } from 'vue'

const { t } = useContentI18n()

const props = withDefaults(defineProps<{
  fallback?: boolean
  onError?: (error: Error, instance: unknown, info: string) => void
}>(), {
  fallback: true,
  onError: undefined
})

const error = ref<Error | null>(null)
const errorInfo = ref<string>('')
const isDev = computed(() => import.meta.dev)

onErrorCaptured((err: Error, instance: unknown, info: string) => {
  error.value = err
  errorInfo.value = info

  // Call custom error handler if provided
  if (props.onError) {
    props.onError(err, instance, info)
  }

  // Log error to console in development
  if (isDev.value) {
    console.error('ErrorBoundary caught:', {
      error: err,
      errorInfo: info,
      instance
    })
  }

  // Prevent error from propagating
  return false
})

const reset = () => {
  error.value = null
  errorInfo.value = ''
}
</script>

<template>
  <div>
    <div v-if="error && fallback" class="min-h-[400px] flex items-center justify-center p-6">
      <UCard class="max-w-2xl w-full">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-error-500" />
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ t('common.boundary.title') }}
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {{ t('common.boundary.description') }}
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <div v-if="isDev" class="rounded-lg bg-gray-100 dark:bg-gray-800 p-4">
            <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">
              {{ t('common.boundary.devMode') }}
            </p>
            <pre class="text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-40">{{ error.message }}</pre>
            <p v-if="errorInfo" class="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {{ t('common.boundary.errorInfo') }}: {{ errorInfo }}
            </p>
          </div>

          <div class="flex gap-3">
            <UButton
              color="primary"
              icon="i-heroicons-arrow-path"
              @click="reset"
            >
              {{ t('common.boundary.retry') }}
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-home"
              @click="navigateTo('/')"
            >
              {{ t('common.boundary.goHome') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <slot v-else />
  </div>
</template>
