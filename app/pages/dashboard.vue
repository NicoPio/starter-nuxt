<!-- T021 & T033: User dashboard with auth protection and profile data -->
<script setup lang="ts">
const { t } = useContentI18n()
const { profile, fetchProfile, loading } = useUser()

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

useSeoMeta({
  title: t('dashboard.title'),
  description: t('dashboard.description')
})

// Fetch profile on mount
onMounted(async () => {
  if (!profile.value) {
    await fetchProfile()
  }
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ t('dashboard.heading') }}
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        {{ t('dashboard.subheading') }}
      </p>
    </div>

    <div v-if="loading && !profile" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard v-for="i in 3" :key="i">
        <USkeleton class="h-32 w-full" />
      </UCard>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">{{ t('dashboard.welcome.title') }}</h3>
        </template>
        <div class="space-y-3">
          <div v-if="profile?.avatar_url" class="flex items-center gap-3">
            <img
              :src="profile.avatar_url"
              :alt="profile.full_name || profile.email"
              class="h-12 w-12 rounded-full object-cover"
            >
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ profile.full_name || profile.email }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ profile.role }}
              </p>
            </div>
          </div>
          <p v-else class="text-gray-600 dark:text-gray-400">
            {{ t('dashboard.welcome.message', { name: profile?.full_name || profile?.email || '' }) }}
          </p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">{{ t('dashboard.quickActions.title') }}</h3>
        </template>
        <div class="space-y-2">
          <UButton to="/profile" block variant="soft">
            {{ t('dashboard.quickActions.viewProfile') }}
          </UButton>
          <UButton to="/subscription" block variant="soft">
            {{ t('dashboard.quickActions.manageSubscription') }}
          </UButton>
          <UButton v-if="profile?.role === 'Admin'" to="/admin" block variant="soft" color="primary">
            {{ t('dashboard.quickActions.adminPanel') }}
          </UButton>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">{{ t('dashboard.accountStatus.title') }}</h3>
        </template>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ t('dashboard.accountStatus.status') }}
            </span>
            <span class="text-sm font-medium text-green-600">
              {{ t('dashboard.accountStatus.active') }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ t('dashboard.accountStatus.role') }}
            </span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              {{ profile?.role }}
            </span>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
