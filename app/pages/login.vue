<script setup lang="ts">
const { t } = useContentI18n()

definePageMeta({
  layout: 'default',
  middleware: 'guest'
})

const siteUrl = 'https://your-saas-app.com' // TODO: Replace with actual site URL
const title = t('auth.login.title')
const description = t('auth.login.description')

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: `${siteUrl}/login`,
  robots: 'noindex, nofollow', // Don't index auth pages
  twitterCard: 'summary',
  twitterTitle: title,
  twitterDescription: description
})

useHead({
  htmlAttrs: {
    lang: 'en'
  }
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
          {{ t('auth.login.heading') }}
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ t('auth.login.subheading') }}
        </p>
      </div>

      <UCard>
        <AuthLoginForm />
      </UCard>
    </div>
  </div>
</template>
