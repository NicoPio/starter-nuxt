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

const onSubmit = async () => {
  loading.value = true

  try {
    const { data, error } = await resetPassword(
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
  <div class="space-y-6">
    <UForm
      :state="state"
      :validate="validate"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        :label="t('auth.resetPassword.password')"
        name="password"
        required
      >
        <UInput
          v-model="state.password"
          name="password"
          type="password"
          :placeholder="t('auth.resetPassword.passwordPlaceholder')"
          autocomplete="new-password"
          size="lg"
          required
        />
        <template #hint>
          <span class="text-xs text-gray-500">
            {{ t('auth.resetPassword.passwordHint') }}
          </span>
        </template>
      </UFormField>

      <UFormField
        :label="t('auth.resetPassword.confirmPassword')"
        name="confirmPassword"
        required
      >
        <UInput
          v-model="state.confirmPassword"
          name="confirmPassword"
          type="password"
          :placeholder="t('auth.resetPassword.confirmPasswordPlaceholder')"
          autocomplete="new-password"
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
        {{ t('auth.resetPassword.submit') }}
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
