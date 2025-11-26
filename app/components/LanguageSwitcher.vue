<template>
  <UDropdownMenu :items="items" :popper="{ placement: 'bottom-end' }">
    <UButton
      color="neutral"
      variant="ghost"
      :icon="currentLocale === 'en' ? 'i-heroicons-language' : 'i-heroicons-language'"
      trailing-icon="i-heroicons-chevron-down-20-solid"
    >
      {{ currentLocale === 'en' ? 'EN' : 'FR' }}
    </UButton>
  </UDropdownMenu>
</template>

<script setup lang="ts">
const { locale, setLocale } = useContentI18n()

const currentLocale = computed(() => locale.value)

const items = computed(() => [
  [{
    label: 'English',
    icon: 'i-heroicons-language',
    click: async () => {
      await setLocale('en')
    }
  }, {
    label: 'Français',
    icon: 'i-heroicons-language',
    click: async () => {
      await setLocale('fr')
    }
  }]
])
</script>
