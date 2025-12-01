<template>
  <UButton
    :icon="colorMode.value === 'dark' ? 'i-heroicons-moon-solid' : 'i-heroicons-sun-solid'"
    color="neutral"
    variant="ghost"
    :aria-label="colorMode.value === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'"
    @click="toggleColorMode"
  />
</template>

<script setup lang="ts">
const colorMode = useColorMode()

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>
