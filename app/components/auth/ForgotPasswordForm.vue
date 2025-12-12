<script setup lang="ts">
import { z } from 'zod'

const { t } = useContentI18n()
const { requestPasswordReset } = usePasswordReset()

const forgotPasswordSchema = z.object({
  email: z.string().email('auth.validation.emailInvalid'),
})

const state = reactive({
  email: '',
})

const loading = ref(false)
const submitted = ref(false)

const validate = (state: { email: string }) => {
  const errors: Array<{ path: string; message: string }> = []
  const result = forgotPasswordSchema.safeParse(state)

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      errors.push({
        path: issue.path.join('.'),
        message: t(issue.message),
      })
    })
  }

  return errors
}

const onSubmit = async () => {
  loading.value = true

  try {
    await requestPasswordReset(state.email)

    // Mark as submitted successfully
    submitted.value = true

    // Reset form
    state.email = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Success Message -->
    <UAlert
      v-if="submitted"
      color="green"
      variant="subtle"
      :title="t('auth.forgotPassword.success')"
      :description="t('auth.forgotPassword.successMessage')"
      icon="i-heroicons-check-circle"
    />

    <!-- Form -->
    <UForm
      :state="state"
      :validate="validate"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        :label="t('auth.forgotPassword.email')"
        name="email"
        required
      >
        <UInput
          v-model="state.email"
          name="email"
          type="email"
          :placeholder="t('auth.forgotPassword.emailPlaceholder')"
          autocomplete="email"
          size="lg"
          required
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
        {{ t('auth.forgotPassword.submit') }}
      </UButton>

      <p class="text-center text-sm text-gray-600 dark:text-gray-400">
        <NuxtLink
          to="/auth/login"
          class="text-primary-600 hover:text-primary-700 font-medium"
        >
          {{ t('auth.forgotPassword.backToLogin') }}
        </NuxtLink>
      </p>
    </UForm>
  </div>
</template>
