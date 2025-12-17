<script setup lang="ts">
const { t } = useContentI18n()
const config = useRuntimeConfig()
const route = useRoute()
const _router = useRouter()
const { verifyResetToken } = usePasswordReset()

definePageMeta({
  layout: 'default',
  middleware: 'guest',
})

// Get token from URL query parameter
const token = computed(() => route.query.token as string | undefined)

// Token validation state
const tokenValidating = ref(true)
const tokenValid = ref(false)
const tokenError = ref<string | null>(null)

// Verify token on mount
onMounted(async () => {
  if (!token.value) {
    tokenError.value = t('auth.resetPassword.invalidToken')
    tokenValidating.value = false
    return
  }

  try {
    const { data, error } = await verifyResetToken(token.value)

    if (error || !data || !data.isValid) {
      tokenError.value = t('auth.resetPassword.invalidToken')
      tokenValid.value = false
    } else {
      tokenValid.value = true
    }
  } catch (err) {
    console.error('Token verification error:', err)
    tokenError.value = t('auth.resetPassword.invalidToken')
    tokenValid.value = false
  } finally {
    tokenValidating.value = false
  }
})

const siteUrl = config.public.siteUrl
const title = t('auth.resetPassword.title')
const description = t('auth.resetPassword.description')

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: `${siteUrl}/auth/reset-password`,
  robots: 'noindex, nofollow', // Don't index auth pages
  twitterCard: 'summary',
  twitterTitle: title,
  twitterDescription: description,
})

useHead({
  htmlAttrs: {
    lang: 'fr',
  },
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <NuxtLink to="/" class="inline-block mb-6">
          <AppLogo class="h-12 w-auto" />
        </NuxtLink>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ t('auth.resetPassword.heading') }}
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ t('auth.resetPassword.subheading') }}
        </p>
      </div>

      <UCard>
        <!-- Loading state -->
        <div v-if="tokenValidating" class="text-center py-8">
          <Icon name="i-heroicons-arrow-path" class="w-8 h-8 mx-auto animate-spin text-primary-500" />
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Vérification du lien...
          </p>
        </div>

        <!-- Invalid token error -->
        <div v-else-if="tokenError" class="space-y-4">
          <UAlert
            color="error"
            variant="subtle"
            :title="t('auth.resetPassword.error')"
            :description="tokenError"
            icon="i-heroicons-exclamation-circle"
          />

          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Le lien de réinitialisation est peut-être expiré ou a déjà été utilisé.
            </p>

            <div class="space-y-2">
              <UButton
                to="/auth/forgot-password"
                block
                size="lg"
                color="primary"
              >
                Demander un nouveau lien
              </UButton>

              <UButton
                to="/login"
                block
                size="lg"
                variant="outline"
                color="neutral"
              >
                Retour à la connexion
              </UButton>
            </div>
          </div>
        </div>

        <!-- Valid token - show reset form -->
        <AuthResetPasswordForm
          v-else-if="tokenValid && token"
          :token="token"
        />
      </UCard>
    </div>
  </div>
</template>
