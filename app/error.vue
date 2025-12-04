<script setup lang="ts">
import type { NuxtError } from '#app'

const { t } = useContentI18n()

const props = defineProps<{
  error: NuxtError
}>()

const isDev = computed(() => import.meta.dev)
const is404 = computed(() => props.error.statusCode === 404)
const is500 = computed(() => props.error.statusCode === 500)

const errorTitle = computed(() => {
  if (is404.value) return t('error.notFound.title')
  if (is500.value) return t('error.serverError.title')
  return t('error.generic.title')
})

const errorDescription = computed(() => {
  if (is404.value) return t('error.notFound.description')
  if (is500.value) return t('error.serverError.description')
  return t('error.generic.description')
})

const errorIcon = computed(() => {
  if (is404.value) return 'i-heroicons-magnifying-glass'
  if (is500.value) return 'i-heroicons-exclamation-triangle'
  return 'i-heroicons-x-circle'
})

const errorCode = computed(() => props.error.statusCode || 500)

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <UCard class="max-w-2xl w-full shadow-2xl">
        <div class="text-center space-y-6 py-8">
          <!-- Error icon and code -->
          <div class="flex flex-col items-center gap-4">
            <div class="relative">
              <div class="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full" />
              <UIcon :name="errorIcon" class="w-24 h-24 text-primary-500 relative z-10" />
            </div>
            <div class="text-6xl font-bold text-gray-900 dark:text-white">
              {{ errorCode }}
            </div>
          </div>

          <!-- Error message -->
          <div class="space-y-2">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              {{ errorTitle }}
            </h1>
            <p class="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              {{ errorDescription }}
            </p>
          </div>

          <!-- Development mode - error details -->
          <div v-if="isDev && error.message" class="mt-6">
            <UCard class="bg-gray-100 dark:bg-gray-800">
              <div class="text-left">
                <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {{ t('common.boundary.devMode') }}
                </p>
                <pre class="text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-40 whitespace-pre-wrap">{{ error.message }}</pre>
                <pre v-if="error.stack" class="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-60 mt-2 whitespace-pre-wrap">{{ error.stack }}</pre>
              </div>
            </UCard>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <UButton
              size="lg"
              color="primary"
              icon="i-heroicons-home"
              @click="handleError"
            >
              {{ t('error.actions.goHome') }}
            </UButton>
            <UButton
              size="lg"
              color="neutral"
              variant="outline"
              icon="i-heroicons-arrow-path"
              @click="$router.back()"
            >
              {{ t('error.actions.goBack') }}
            </UButton>
          </div>

          <!-- Additional help for 404 -->
          <div v-if="is404" class="pt-6 border-t border-gray-200 dark:border-gray-700">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {{ t('error.notFound.suggestion') }}
            </p>
            <div class="flex flex-wrap gap-2 justify-center">
              <UButton
                to="/"
                size="sm"
                color="neutral"
                variant="soft"
              >
                {{ t('nav.home') }}
              </UButton>
              <UButton
                to="/features"
                size="sm"
                color="neutral"
                variant="soft"
              >
                {{ t('nav.features') }}
              </UButton>
              <UButton
                to="/login"
                size="sm"
                color="neutral"
                variant="soft"
              >
                {{ t('nav.login') }}
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </UApp>
</template>
