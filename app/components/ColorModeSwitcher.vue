<template>
  <UButton
    :icon="colorMode.value === 'dark' ? 'i-heroicons-moon-solid' : 'i-heroicons-sun-solid'"
    color="neutral"
    variant="ghost"
    :aria-label="t('accessibility.colorModeSwitcher', { mode: colorMode.value === 'dark' ? t('accessibility.lightMode') : t('accessibility.darkMode') })"
    @click="toggleColorMode"
  />
</template>

<script setup lang="ts">
const { t } = useContentI18n()
const colorMode = useColorMode()

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>
