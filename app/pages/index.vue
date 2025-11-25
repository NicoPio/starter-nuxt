<script setup lang="ts">
const { data: homepage } = await useAsyncData('homepage', () =>
  queryCollection('homepage')
    .all()
    .then(results => results[0] || null)
)
</script>

<template>
    <div v-if="homepage">
        <UPageHero
            :title="homepage.hero.title"
            :description="homepage.hero.description"
            :links="homepage.hero.links" />

        <UPageSection
            id="features"
            :title="homepage.features.title"
            :description="homepage.features.description"
            :features="homepage.features.items" />

        <UPageSection>
            <UPageCTA
                :title="homepage.cta.title"
                :description="homepage.cta.description"
                :variant="homepage.cta.variant"
                :links="homepage.cta.links" />
        </UPageSection>
    </div>
</template>