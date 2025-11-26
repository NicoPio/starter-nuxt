<!-- T020: Features page displaying content from Nuxt Content -->
<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { data: page } = await useAsyncData('features', () =>
  queryContent('/pages/features').findOne()
)
</script>

<template>
  <div class="container mx-auto px-4 py-12">
    <div v-if="page" class="prose dark:prose-invert max-w-4xl mx-auto">
      <ContentRenderer :value="page" />
    </div>
    <div v-else>
      <p>Loading...</p>
    </div>
  </div>
</template>
