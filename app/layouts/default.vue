<!-- T015: Default layout for public pages -->
<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow">
      <div class="container mx-auto px-4 py-4">
        <div class="flex justify-between items-center">
          <NuxtLink to="/" class="flex items-center space-x-2">
            <AppLogo class="h-8 w-8" />
            <span class="text-xl font-bold">{{ $t('app.title') }}</span>
          </NuxtLink>

          <nav class="flex items-center space-x-4">
            <NuxtLink to="/" class="hover:text-primary">
              {{ $t('nav.home') }}
            </NuxtLink>
            <NuxtLink to="/features" class="hover:text-primary">
              {{ $t('nav.features') }}
            </NuxtLink>
            <NuxtLink
              v-if="!user"
              to="/login"
              class="hover:text-primary"
            >
              {{ $t('nav.login') }}
            </NuxtLink>
            <UButton
              v-if="!user"
              to="/signup"
              color="primary"
            >
              {{ $t('nav.signup') }}
            </UButton>
            <UButton
              v-if="user"
              to="/dashboard"
              color="primary"
            >
              {{ $t('nav.dashboard') }}
            </UButton>
            <LanguageSwitcher />
          </nav>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main>
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
      <div class="container mx-auto px-4 py-8">
        <div class="text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2025 {{ $t('app.title') }}. All rights reserved.</p>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
const { user } = useAuth()
const { t: $t } = useContentI18n()
</script>
