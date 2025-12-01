<script setup lang="ts">
import { z } from 'zod'
import { authClient } from '~/lib/auth-client'

const { t } = useContentI18n()
const toast = useToast()
const route = useRoute()

const loginSchema = z.object({
  email: z.string().email('auth.validation.emailInvalid'),
  password: z.string().min(1, 'auth.validation.passwordRequired')
})

const state = reactive({
  email: '',
  password: '',
  remember: false
})

const loading = ref(false)
const socialLoading = ref<string | null>(null)

const validate = (state: { email: string; password: string }) => {
  const errors: Array<{ path: string; message: string }> = []
  const result = loginSchema.safeParse(state)

  if (!result.success) {
    result.error.issues.forEach(issue => {
      errors.push({
        path: issue.path.join('.'),
        message: t(issue.message)
      })
    })
  }

  return errors
}

const onSubmit = async () => {
  loading.value = true

  try {
    const response = await authClient.signIn.email({
      email: state.email,
      password: state.password,
      rememberMe: state.remember
    })

    if (response.error) {
      toast.add({
        title: t('auth.login.error'),
        description: response.error.message || t('auth.login.errorGeneric'),
        color: 'error'
      })
      return
    }

    toast.add({
      title: t('auth.login.success'),
      description: t('auth.login.successMessage'),
      color: 'success'
    })

    const redirectTo = (route.query.redirect as string) || '/dashboard'

    await new Promise(resolve => setTimeout(resolve, 100))

    if (import.meta.client) {
      window.location.href = redirectTo
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('auth.login.errorGeneric')
    toast.add({
      title: t('auth.login.error'),
      description: message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

const signInWithSocial = async (provider: 'github' | 'google' | 'apple') => {
  socialLoading.value = provider

  try {
    await authClient.signIn.social({
      provider,
      callbackURL: (route.query.redirect as string) || '/dashboard'
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('auth.login.errorGeneric')
    toast.add({
      title: t('auth.login.error'),
      description: message,
      color: 'error'
    })
    socialLoading.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-3">
      <UButton
        :loading="socialLoading === 'github'"
        :disabled="!!socialLoading"
        block
        size="lg"
        variant="outline"
        color="neutral"
        @click="signInWithSocial('github')"
      >
        <template #leading>
          <Icon name="i-simple-icons-github" class="w-5 h-5" />
        </template>
        Continue with GitHub
      </UButton>

      <UButton
        :loading="socialLoading === 'google'"
        :disabled="!!socialLoading"
        block
        size="lg"
        variant="outline"
        color="neutral"
        @click="signInWithSocial('google')"
      >
        <template #leading>
          <Icon name="i-simple-icons-google" class="w-5 h-5" />
        </template>
        Continue with Google
      </UButton>

      <UButton
        :loading="socialLoading === 'apple'"
        :disabled="!!socialLoading"
        block
        size="lg"
        variant="outline"
        color="neutral"
        @click="signInWithSocial('apple')"
      >
        <template #leading>
          <Icon name="i-simple-icons-apple" class="w-5 h-5" />
        </template>
        Continue with Apple
      </UButton>
    </div>

    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-300 dark:border-gray-700" />
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="px-2 bg-white dark:bg-gray-900 text-gray-500">
          Or continue with email
        </span>
      </div>
    </div>

    <UForm :state="state" :validate="validate" class="space-y-4" @submit="onSubmit">
      <UFormField :label="t('auth.login.email')" name="email" required>
        <UInput
          v-model="state.email"
          type="email"
          :placeholder="t('auth.login.emailPlaceholder')"
          autocomplete="email"
          size="lg"
          required
        />
      </UFormField>

      <UFormField :label="t('auth.login.password')" name="password" required>
        <UInput
          v-model="state.password"
          type="password"
          :placeholder="t('auth.login.passwordPlaceholder')"
          autocomplete="current-password"
          size="lg"
          required
        />
        <template #hint>
          <NuxtLink to="/forgot-password" class="text-xs text-primary-600 hover:text-primary-700">
            {{ t('auth.login.forgotPassword') }}
          </NuxtLink>
        </template>
      </UFormField>

      <UFormField name="remember">
        <UCheckbox
          v-model="state.remember"
          :label="t('auth.login.rememberMe')"
        />
      </UFormField>

      <UButton
        type="submit"
        :loading="loading"
        :disabled="loading || !!socialLoading"
        block
        size="lg"
        color="primary"
      >
        {{ t('auth.login.submit') }}
      </UButton>

      <p class="text-center text-sm text-gray-600 dark:text-gray-400">
        {{ t('auth.login.noAccount') }}
        <NuxtLink to="/signup" class="text-primary-600 hover:text-primary-700 font-medium">
          {{ t('auth.login.signupLink') }}
        </NuxtLink>
      </p>
    </UForm>
  </div>
</template>
