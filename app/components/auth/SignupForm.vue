<script setup lang="ts">
import { z } from 'zod'

const { t } = useContentI18n()
const toast = useToast()

// Zod validation schema
const signupSchema = z.object({
  email: z.string().email('auth.validation.emailInvalid'),
  password: z.string().min(8, 'auth.validation.passwordTooShort'),
  full_name: z.string().optional()
})

// Form state
const state = reactive({
  email: '',
  password: '',
  full_name: ''
})

const loading = ref(false)

// Validate function for UForm
const validate = (state: any) => {
  const errors = []
  const result = signupSchema.safeParse(state)

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
    const { data, error } = await $fetch('/api/auth/signup', {
      method: 'POST',
      body: {
        email: state.email,
        password: state.password,
        full_name: state.full_name || undefined
      }
    })

    if (error) {
      toast.add({
        title: t('auth.signup.error'),
        description: error.message || t('auth.signup.errorGeneric'),
        color: 'red'
      })
      return
    }

    toast.add({
      title: t('auth.signup.success'),
      description: t('auth.signup.successMessage'),
      color: 'green'
    })

    // Redirect to dashboard
    await navigateTo('/dashboard')
  } catch (err: any) {
    toast.add({
      title: t('auth.signup.error'),
      description: err.message || t('auth.signup.errorGeneric'),
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UForm :state="state" :validate="validate" @submit="onSubmit" class="space-y-4">
    <UFormField :label="t('auth.signup.fullName')" name="full_name">
      <UInput
        v-model="state.full_name"
        type="text"
        :placeholder="t('auth.signup.fullNamePlaceholder')"
        size="lg"
      />
    </UFormField>

    <UFormField :label="t('auth.signup.email')" name="email" required>
      <UInput
        v-model="state.email"
        type="email"
        :placeholder="t('auth.signup.emailPlaceholder')"
        autocomplete="email"
        size="lg"
        required
      />
    </UFormField>

    <UFormField :label="t('auth.signup.password')" name="password" required>
      <UInput
        v-model="state.password"
        type="password"
        :placeholder="t('auth.signup.passwordPlaceholder')"
        autocomplete="new-password"
        size="lg"
        required
      />
      <template #hint>
        <span class="text-xs text-gray-500">
          {{ t('auth.signup.passwordHint') }}
        </span>
      </template>
    </UFormField>

    <UButton
      type="submit"
      :loading="loading"
      :disabled="loading"
      block
      size="lg"
      color="primary"
    >
      {{ t('auth.signup.submit') }}
    </UButton>

    <p class="text-center text-sm text-gray-600 dark:text-gray-400">
      {{ t('auth.signup.hasAccount') }}
      <NuxtLink to="/login" class="text-primary-600 hover:text-primary-700 font-medium">
        {{ t('auth.signup.loginLink') }}
      </NuxtLink>
    </p>
  </UForm>
</template>
