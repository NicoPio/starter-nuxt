<script setup lang="ts">
definePageMeta({
  middleware: ['admin'],
  layout: 'default',
})

const { fetchConfig, loading } = useStripeConfig()
const { t } = useContentI18n()

// Charger la configuration au montage de la page
onMounted(async () => {
  await fetchConfig()
})

// Meta tags pour SEO
useSeoMeta({
  title: t('stripe.page.title'),
  description: t('stripe.page.description'),
  robots: 'noindex, nofollow', // Page admin, pas d'indexation
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold">
        {{ t('stripe.page.heading') }}
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        {{ t('stripe.page.subheading') }}
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Content Grid -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left Column: Configuration Form -->
      <div>
        <AdminStripeConfigurationForm />
      </div>

      <!-- Right Column: Connection Status -->
      <div>
        <AdminStripeConnectionStatus />
      </div>
    </div>

    <!-- Documentation Link -->
    <div class="mt-8">
      <UCard>
        <div class="flex items-start gap-4">
          <UIcon name="i-heroicons-book-open" class="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
          <div class="flex-1">
            <h3 class="font-semibold mb-2">{{ t('stripe.page.docs.title') }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {{ t('stripe.page.docs.description') }}
            </p>
            <div class="flex flex-wrap gap-2">
              <UButton
                to="https://docs.stripe.com/keys"
                target="_blank"
                color="primary"
                variant="soft"
                size="sm"
                icon="i-heroicons-arrow-top-right-on-square"
              >
                {{ t('stripe.page.docs.apiKeys') }}
              </UButton>
              <UButton
                to="https://docs.stripe.com/webhooks"
                target="_blank"
                color="primary"
                variant="soft"
                size="sm"
                icon="i-heroicons-arrow-top-right-on-square"
              >
                {{ t('stripe.page.docs.webhooks') }}
              </UButton>
              <UButton
                to="https://docs.stripe.com/testing"
                target="_blank"
                color="primary"
                variant="soft"
                size="sm"
                icon="i-heroicons-arrow-top-right-on-square"
              >
                {{ t('stripe.page.docs.testing') }}
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
