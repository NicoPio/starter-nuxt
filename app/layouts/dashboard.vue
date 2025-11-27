<!-- T016: Dashboard layout for authenticated pages -->
<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow">
      <div class="container mx-auto px-4 py-4">
        <div class="flex justify-between items-center">
          <NuxtLink to="/dashboard" class="flex items-center space-x-2">
            <AppLogo class="h-8 w-8" />
            <span class="text-xl font-bold">{{ $t('app.title') }}</span>
          </NuxtLink>

          <nav class="flex items-center space-x-4">
            <NuxtLink to="/dashboard" class="hover:text-primary">
              {{ $t('nav.dashboard') }}
            </NuxtLink>
            <NuxtLink to="/profile" class="hover:text-primary">
              {{ $t('nav.profile') }}
            </NuxtLink>
            <NuxtLink to="/subscription" class="hover:text-primary">
              {{ $t('nav.subscription') }}
            </NuxtLink>

            <LanguageSwitcher />

            <UDropdownMenu
              :items="userMenuItems"
              :popper="{ placement: 'bottom-end' }"
            >
              <UButton
                color="neutral"
                variant="ghost"
                :label="user?.email"
                trailing-icon="i-heroicons-chevron-down-20-solid"
              />
            </UDropdownMenu>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="container mx-auto px-4 py-8">
      <slot />
    </main>

  </div>
</template>

<script setup lang="ts">
const { user, logout } = useAuth()
const router = useRouter()
const { t } = useContentI18n()
const $t = t

const handleLogout = async () => {
  await logout()
}

const userMenuItems = computed(() => [
  [{
    label: t('nav.profile'),
    icon: 'i-heroicons-user',
    click: () => router.push('/profile')
  }],
  [{
    label: t('nav.logout'),
    icon: 'i-heroicons-arrow-right-on-rectangle',
    click: handleLogout
  }]
])
</script>
