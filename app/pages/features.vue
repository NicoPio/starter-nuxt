<!-- T020: Features page displaying content from Nuxt Content -->
<script setup lang="ts">
const { t } = useContentI18n()

definePageMeta({
  layout: 'default'
})

const { data: page } = await useAsyncData('features', () =>
  $fetch('/api/_content/query', {
    method: 'POST',
    body: {
      first: true,
      where: [{ _path: '/pages/features' }]
    }
  })
)

const siteUrl = 'https://your-saas-app.com' // TODO: Replace with actual site URL
const title = t('seo.features.title')
const description = t('seo.features.description')

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: `${siteUrl}/features`,
  ogImage: `${siteUrl}/og-image.png`,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: `${siteUrl}/og-image.png`
})

useHead({
  htmlAttrs: {
    lang: 'en'
  },
  link: [
    {
      rel: 'canonical',
      href: `${siteUrl}/features`
    }
  ]
})
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
