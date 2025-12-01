<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const { t } = useContentI18n()

useSeoMeta({
  title: t('admin.config.title'),
  description: t('admin.config.description')
})
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ t('admin.config.heading') }}
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        {{ t('admin.config.subheading') }}
      </p>
    </div>

    <div class="space-y-6">
      <AdminStripeConfigForm />

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('admin.config.other.title') }}
          </h3>
        </template>

        <div class="text-sm text-gray-600 dark:text-gray-400">
          <p>{{ t('admin.config.other.comingSoon') }}</p>
        </div>
      </UCard>
    </div>
  </div>
</template>
