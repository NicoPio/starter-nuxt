<script setup lang="ts">
// Forcer le mode clair
const colorMode = useColorMode()
colorMode.preference = 'light'
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>