<script setup lang="ts">
const { t } = useContentI18n()
const { profile, fetchProfile, loading } = useUser()

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

useSeoMeta({
  title: t('profile.title'),
  description: t('profile.description')
})

// Fetch profile on mount
onMounted(async () => {
  if (!profile.value) {
    await fetchProfile()
  }
})
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ t('profile.heading') }}
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        {{ t('profile.subheading') }}
      </p>
    </div>

    <UCard v-if="loading && !profile">
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"/>
          <p class="text-gray-600 dark:text-gray-400">{{ t('profile.loading') }}</p>
        </div>
      </div>
    </UCard>

    <UCard v-else>
      <ProfileProfileForm />
    </UCard>
  </div>
</template>
