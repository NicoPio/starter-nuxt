<script setup lang="ts">
import { z } from 'zod'

const { t } = useContentI18n()
const toast = useToast()

const stripeConfigSchema = z.object({
  stripe_public_key: z.string().min(1, 'admin.stripe.validation.publicKeyRequired').startsWith('pk_', 'admin.stripe.validation.publicKeyInvalid'),
  stripe_secret_key: z.string().min(1, 'admin.stripe.validation.secretKeyRequired').startsWith('sk_', 'admin.stripe.validation.secretKeyInvalid'),
  webhook_secret: z.string().min(1, 'admin.stripe.validation.webhookSecretRequired').startsWith('whsec_', 'admin.stripe.validation.webhookSecretInvalid'),
  is_test_mode: z.boolean()
})

const state = reactive({
  stripe_public_key: '',
  stripe_secret_key: '',
  webhook_secret: '',
  is_test_mode: true
})

const loading = ref(false)
const saving = ref(false)
const showSecretKey = ref(false)
const showWebhookSecret = ref(false)

onMounted(async () => {
  await fetchConfig()
})

interface StripeConfigResponse {
  stripe_public_key: string
  is_test_mode: boolean
  configured: boolean
}

const fetchConfig = async () => {
  loading.value = true
  try {
    const data = await $fetch<StripeConfigResponse>('/api/admin/config/stripe')
    if (data) {
      state.stripe_public_key = data.stripe_public_key || ''
      state.is_test_mode = data.is_test_mode ?? true
    }
  } catch (error: unknown) {
    console.error('Error fetching config:', error)
  } finally {
    loading.value = false
  }
}

interface FormState {
  stripe_public_key: string
  stripe_secret_key: string
  webhook_secret: string
  is_test_mode: boolean
}

const validate = (formState: Partial<FormState>) => {
  const errors: Array<{ path: string; message: string }> = []
  const result = stripeConfigSchema.safeParse(formState)

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
  saving.value = true

  try {
    await $fetch('/api/admin/config/stripe', {
      method: 'POST',
      body: {
        stripe_public_key: state.stripe_public_key,
        stripe_secret_key: state.stripe_secret_key,
        webhook_secret: state.webhook_secret,
        is_test_mode: state.is_test_mode
      }
    })

    toast.add({
      title: t('admin.stripe.save.success'),
      description: t('admin.stripe.save.successMessage'),
      color: 'success'
    })

    state.stripe_secret_key = ''
    state.webhook_secret = ''
  } catch (error: unknown) {
    const message = (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data)
      ? String(error.data.message)
      : t('admin.stripe.save.errorGeneric')
    toast.add({
      title: t('admin.stripe.save.error'),
      description: message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

const testConnection = async () => {
  toast.add({
    title: t('admin.stripe.test.title'),
    description: t('admin.stripe.test.message'),
    color: 'info'
  })
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('admin.stripe.title') }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{ t('admin.stripe.description') }}
          </p>
        </div>
        <UBadge :color="state.is_test_mode ? 'warning' : 'success'" variant="subtle">
          {{ state.is_test_mode ? t('admin.stripe.testMode') : t('admin.stripe.liveMode') }}
        </UBadge>
      </div>
    </template>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <UForm v-else :schema="stripeConfigSchema" :state="state" :validate="validate" class="space-y-6" @submit="onSubmit">
        <div class="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
          <div class="flex gap-3">
            <UIcon name="i-heroicons-information-circle" class="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-blue-800 dark:text-blue-200">
              <p class="font-medium mb-1">{{ t('admin.stripe.info.title') }}</p>
              <p>{{ t('admin.stripe.info.message') }}</p>
            </div>
          </div>
        </div>

        <UFormField :label="t('admin.stripe.fields.publicKey')" name="stripe_public_key" required>
          <UInput
            v-model="state.stripe_public_key"
            placeholder="pk_test_..."
            icon="i-heroicons-key"
          />
        </UFormField>

        <UFormField :label="t('admin.stripe.fields.secretKey')" name="stripe_secret_key" required>
          <UInput
            v-model="state.stripe_secret_key"
            :type="showSecretKey ? 'text' : 'password'"
            placeholder="sk_test_..."
            icon="i-heroicons-lock-closed"
          >
            <template #trailing>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :icon="showSecretKey ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                @click="showSecretKey = !showSecretKey"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField :label="t('admin.stripe.fields.webhookSecret')" name="webhook_secret" required>
          <UInput
            v-model="state.webhook_secret"
            :type="showWebhookSecret ? 'text' : 'password'"
            placeholder="whsec_..."
            icon="i-heroicons-shield-check"
          >
            <template #trailing>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :icon="showWebhookSecret ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                @click="showWebhookSecret = !showWebhookSecret"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField :label="t('admin.stripe.fields.testMode')" name="is_test_mode">
          <div class="flex items-center gap-3">
            <USwitch v-model="state.is_test_mode" />
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ state.is_test_mode ? t('admin.stripe.testModeEnabled') : t('admin.stripe.liveModeEnabled') }}
            </span>
          </div>
        </UFormField>

        <div class="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <div class="flex gap-3">
            <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-yellow-800 dark:text-yellow-200">
              <p class="font-medium">{{ t('admin.stripe.warning') }}</p>
            </div>
          </div>
        </div>

      <div class="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
        <UButton
          color="neutral"
          variant="outline"
          :disabled="saving"
          @click="testConnection"
        >
          {{ t('admin.stripe.testButton') }}
        </UButton>

        <div class="flex gap-3">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="saving"
            @click="fetchConfig"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            type="submit"
            color="primary"
            :loading="saving"
          >
            {{ t('common.save') }}
          </UButton>
        </div>
      </div>
    </UForm>
  </UCard>
</template>
