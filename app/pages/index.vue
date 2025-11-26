<!-- T018: Public landing page -->
<script setup lang="ts">
definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div>
    <UPageHero
      title="SaaS Starter"
      description="Your modern SaaS application"
      :links="[
        {
          label: 'Sign Up',
          to: '/signup',
          color: 'primary',
          size: 'lg'
        },
        {
          label: 'Features',
          to: '/features',
          size: 'lg',
          variant: 'ghost'
        }
      ]"
    />

    <UPageSection
      id="features"
      title="Features"
      description="Everything you need to build a modern SaaS application"
      :features="[
        {
          title: 'User Management',
          description: 'Complete authentication system with role-based access control',
          icon: 'i-heroicons-users'
        },
        {
          title: 'Subscriptions',
          description: 'Integrated Stripe payments and subscription management',
          icon: 'i-heroicons-credit-card'
        },
        {
          title: 'Admin Dashboard',
          description: 'Powerful admin tools for managing users and configurations',
          icon: 'i-heroicons-cog'
        },
        {
          title: 'Multi-language',
          description: 'Built-in internationalization support for global reach',
          icon: 'i-heroicons-language'
        }
      ]"
    />

    <UPageSection>
      <UPageCTA
        title="Ready to get started?"
        description="Create your account and start building today"
        :links="[
          {
            label: 'Sign Up',
            to: '/signup',
            color: 'primary',
            size: 'lg'
          }
        ]"
      />
    </UPageSection>
  </div>
</template>