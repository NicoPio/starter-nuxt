<script setup lang="ts">
const { t } = useContentI18n()

definePageMeta({
  layout: 'default',
  middleware: 'guest'
})

useSeoMeta({
  title: t('auth.signup.title'),
  description: t('auth.signup.description')
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <NuxtLink to="/" class="inline-block mb-6">
          <AppLogo class="h-12 w-auto" />
        </NuxtLink>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ t('auth.signup.heading') }}
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ t('auth.signup.subheading') }}
        </p>
      </div>

      <UCard>
        <AuthSignupForm />
      </UCard>
    </div>
  </div>
</template>
