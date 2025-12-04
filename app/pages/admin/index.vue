<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const { user } = useRole()

// Statistiques basiques
const { data: stats } = await useFetch('/api/admin/users', {
  query: { page: 1, limit: 1 }
})

const totalUsers = computed(() => stats.value?.pagination?.total || 0)

useSeoMeta({
  title: 'Tableau de bord Admin',
  description: 'Administration du système'
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        Tableau de bord Admin
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Bienvenue, {{ user?.name || user?.email }}
      </p>
    </div>

    <!-- Statistiques rapides -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Utilisateurs totaux</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ totalUsers }}
            </p>
          </div>
          <UIcon name="i-heroicons-users" class="w-12 h-12 text-primary-500" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Gestion</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              Utilisateurs
            </p>
          </div>
          <UIcon name="i-heroicons-cog-6-tooth" class="w-12 h-12 text-primary-500" />
        </div>
        <template #footer>
          <NuxtLink to="/admin/users">
            <UButton block color="primary" variant="outline">
              Gérer les utilisateurs
            </UButton>
          </NuxtLink>
        </template>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Système</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              Configuration
            </p>
          </div>
          <UIcon name="i-heroicons-wrench-screwdriver" class="w-12 h-12 text-primary-500" />
        </div>
        <template #footer>
          <UButton block color="neutral" variant="outline" disabled>
            Bientôt disponible
          </UButton>
        </template>
      </UCard>
    </div>

    <!-- Actions rapides -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">Actions rapides</h2>
      </template>

      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">Gestion des utilisateurs</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Voir, modifier et gérer les rôles des utilisateurs
            </p>
          </div>
          <NuxtLink to="/admin/users">
            <UButton color="primary">
              Accéder
              <UIcon name="i-heroicons-arrow-right" class="ml-2" />
            </UButton>
          </NuxtLink>
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg opacity-60">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">Configuration Stripe</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Configurer les clés API pour les paiements (à venir)
            </p>
          </div>
          <UButton color="neutral" disabled>
            Bientôt
          </UButton>
        </div>

        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg opacity-60">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">Gestion des abonnements</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Voir et gérer les abonnements actifs (à venir)
            </p>
          </div>
          <UButton color="neutral" disabled>
            Bientôt
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Informations système -->
    <div class="mt-8">
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Informations système</h2>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Version</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">1.0.0 (Beta)</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Base de données</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">PostgreSQL + Better Auth</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Framework</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">Nuxt 4.2.1</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Authentification</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white">Better Auth v1.4.2</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
