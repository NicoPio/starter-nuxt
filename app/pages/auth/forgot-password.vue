<script setup lang="ts">
const { t } = useContentI18n()
const config = useRuntimeConfig()

definePageMeta({
  layout: 'default',
  middleware: 'guest',
})

const siteUrl = config.public.siteUrl
const title = t('auth.forgotPassword.title')
const description = t('auth.forgotPassword.description')

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: `${siteUrl}/auth/forgot-password`,
  robots: 'noindex, nofollow', // Don't index auth pages
  twitterCard: 'summary',
  twitterTitle: title,
  twitterDescription: description,
})

useHead({
  htmlAttrs: {
    lang: 'fr',
  },
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
          {{ t('auth.forgotPassword.heading') }}
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ t('auth.forgotPassword.subheading') }}
        </p>
      </div>

      <UCard>
        <AuthForgotPasswordForm />
      </UCard>
    </div>
  </div>
</template>
