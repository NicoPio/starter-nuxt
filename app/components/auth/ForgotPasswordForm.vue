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

// Client-side validation state
const validationErrors = ref<Array<{ path: string; message: string }>>([])

const validateEmail = () => {
  validationErrors.value = validate(state)
  return validationErrors.value.length === 0
}

const onSubmit = async () => {
  // Validate before submission
  if (!validateEmail()) {
    return
  }

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
  <div class="space-y-6" role="region" aria-labelledby="forgot-password-heading">
    <!-- Heading for accessibility -->
    <h1 id="forgot-password-heading" class="sr-only">
      {{ t('auth.forgotPassword.title') }}
    </h1>

    <!-- Success Message -->
    <UAlert
      v-if="submitted"
      color="success"
      variant="subtle"
      :title="t('auth.forgotPassword.success')"
      :description="t('auth.forgotPassword.successMessage')"
      icon="i-heroicons-check-circle"
      role="alert"
      aria-live="polite"
    />

    <!-- Form -->
    <UForm
      :state="state"
      :validate="validate"
      class="space-y-4"
      aria-labelledby="forgot-password-form-heading"
      @submit="onSubmit"
    >
      <h2 id="forgot-password-form-heading" class="sr-only">
        {{ t('auth.forgotPassword.formTitle') }}
      </h2>

      <UFormField
        :label="t('auth.forgotPassword.email')"
        name="email"
        required
        :error="validationErrors.find(e => e.path === 'email')?.message"
      >
        <UInput
          v-model="state.email"
          name="email"
          type="email"
          :placeholder="t('auth.forgotPassword.emailPlaceholder')"
          autocomplete="email"
          size="lg"
          required
          aria-required="true"
          aria-describedby="email-help email-error"
          :aria-invalid="!!validationErrors.find(e => e.path === 'email')"
          @blur="validateEmail"
        />
        <template #help>
          <span id="email-help" class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('auth.forgotPassword.emailHelp') }}
          </span>
        </template>
        <template v-if="validationErrors.find(e => e.path === 'email')" #error>
          <span id="email-error" class="text-xs text-red-500 dark:text-red-400">
            {{ validationErrors.find(e => e.path === 'email')?.message }}
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
        aria-label="t('auth.forgotPassword.submit')"
        :aria-busy="loading"
      >
        {{ t('auth.forgotPassword.submit') }}
      </UButton>

      <p class="text-center text-sm text-gray-600 dark:text-gray-400">
        <NuxtLink
          to="/login"
          class="text-primary-600 hover:text-primary-700 font-medium"
          aria-label="t('auth.forgotPassword.backToLogin')"
        >
          {{ t('auth.forgotPassword.backToLogin') }}
        </NuxtLink>
      </p>
    </UForm>
  </div>
</template>
