<script setup lang="ts">
import { z } from 'zod'

const { t } = useContentI18n()
const toast = useToast()
const route = useRoute()

// Zod validation schema
const loginSchema = z.object({
  email: z.string().email('auth.validation.emailInvalid'),
  password: z.string().min(1, 'auth.validation.passwordRequired')
})

// Form state
const state = reactive({
  email: '',
  password: '',
  remember: false
})

const loading = ref(false)

// Validate function for UForm
const validate = (state: any) => {
  const errors = []
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
    const { data, error } = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: state.email,
        password: state.password
      }
    })

    if (error) {
      toast.add({
        title: t('auth.login.error'),
        description: error.message || t('auth.login.errorGeneric'),
        color: 'red'
      })
      return
    }

    toast.add({
      title: t('auth.login.success'),
      description: t('auth.login.successMessage'),
      color: 'green'
    })

    // Redirect to original URL or dashboard
    const redirectTo = (route.query.redirect as string) || '/dashboard'
    await navigateTo(redirectTo)
  } catch (err: any) {
    toast.add({
      title: t('auth.login.error'),
      description: err.message || t('auth.login.errorGeneric'),
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UForm :state="state" :validate="validate" @submit="onSubmit" class="space-y-4">
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
      :disabled="loading"
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
</template>
