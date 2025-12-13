<script setup lang="ts">
import { z } from 'zod'

const props = defineProps<{
  token: string
}>()

const { t } = useContentI18n()
const { resetPassword } = usePasswordReset()
const router = useRouter()

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'auth.validation.passwordTooShort'),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.resetPassword.passwordMismatch',
    path: ['confirmPassword'],
  })

const state = reactive({
  password: '',
  confirmPassword: '',
})

const loading = ref(false)

const validate = (state: { password: string; confirmPassword: string }) => {
  const errors: Array<{ path: string; message: string }> = []
  const result = resetPasswordSchema.safeParse(state)

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

const validateForm = () => {
  validationErrors.value = validate(state)
  return validationErrors.value.length === 0
}

const onSubmit = async () => {
  // Validate before submission
  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    const { error } = await resetPassword(
      props.token,
      state.password,
      state.confirmPassword
    )

    if (error) {
      // Error toast is already shown by usePasswordReset composable
      return
    }

    // Success! Redirect to login page after a short delay
    setTimeout(() => {
      router.push('/auth/login')
    }, 1500)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6" role="region" aria-labelledby="reset-password-heading">
    <!-- Heading for accessibility -->
    <h1 id="reset-password-heading" class="sr-only">
      {{ t('auth.resetPassword.title') }}
    </h1>

    <UForm
      :state="state"
      :validate="validate"
      class="space-y-4"
      aria-labelledby="reset-password-form-heading"
      @submit="onSubmit"
    >
      <h2 id="reset-password-form-heading" class="sr-only">
        {{ t('auth.resetPassword.formTitle') }}
      </h2>

      <UFormField
        :label="t('auth.resetPassword.password')"
        name="password"
        required
        :error="validationErrors.find(e => e.path === 'password')?.message"
      >
        <UInput
          v-model="state.password"
          name="password"
          type="password"
          :placeholder="t('auth.resetPassword.passwordPlaceholder')"
          autocomplete="new-password"
          size="lg"
          required
          aria-required="true"
          aria-describedby="password-hint password-error"
          :aria-invalid="!!validationErrors.find(e => e.path === 'password')"
          @blur="validateForm"
        />
        <template #hint>
          <span id="password-hint" class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('auth.resetPassword.passwordHint') }}
          </span>
        </template>
        <template v-if="validationErrors.find(e => e.path === 'password')" #error>
          <span id="password-error" class="text-xs text-red-500 dark:text-red-400">
            {{ validationErrors.find(e => e.path === 'password')?.message }}
          </span>
        </template>
      </UFormField>

      <UFormField
        :label="t('auth.resetPassword.confirmPassword')"
        name="confirmPassword"
        required
        :error="validationErrors.find(e => e.path === 'confirmPassword')?.message"
      >
        <UInput
          v-model="state.confirmPassword"
          name="confirmPassword"
          type="password"
          :placeholder="t('auth.resetPassword.confirmPasswordPlaceholder')"
          autocomplete="new-password"
          size="lg"
          required
          aria-required="true"
          aria-describedby="confirm-password-error"
          :aria-invalid="!!validationErrors.find(e => e.path === 'confirmPassword')"
          @blur="validateForm"
        />
        <template v-if="validationErrors.find(e => e.path === 'confirmPassword')" #error>
          <span id="confirm-password-error" class="text-xs text-red-500 dark:text-red-400">
            {{ validationErrors.find(e => e.path === 'confirmPassword')?.message }}
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
        aria-label="t('auth.resetPassword.submit')"
        :aria-busy="loading"
      >
        {{ t('auth.resetPassword.submit') }}
      </UButton>

      <p class="text-center text-sm text-gray-600 dark:text-gray-400">
        <NuxtLink
          to="/auth/login"
          class="text-primary-600 hover:text-primary-700 font-medium"
          aria-label="t('auth.resetPassword.backToLogin')"
        >
          {{ t('auth.forgotPassword.backToLogin') }}
        </NuxtLink>
      </p>
    </UForm>
  </div>
</template>
