<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const { saveConfig, testConnection, loading, testing } = useStripeConfig()
const { t } = useContentI18n()

// Schéma de validation Zod
const ConfigSchema = z.object({
  secretKey: z.string()
    .min(20, t('stripe.config.validation.secretKeyMin'))
    .startsWith('sk_', t('stripe.config.validation.secretKeyPrefix')),
  publishableKey: z.string()
    .min(20, t('stripe.config.validation.publishableKeyMin'))
    .startsWith('pk_', t('stripe.config.validation.publishableKeyPrefix')),
  webhookSecret: z.string()
    .min(20, t('stripe.config.validation.webhookSecretMin'))
    .startsWith('whsec_', t('stripe.config.validation.webhookSecretPrefix')),
})

type ConfigFormData = z.infer<typeof ConfigSchema>

const state = reactive<ConfigFormData>({
  secretKey: '',
  publishableKey: '',
  webhookSecret: '',
})

const showSecrets = ref(false)

async function onSubmit(event: FormSubmitEvent<ConfigFormData>) {
  await saveConfig(event.data)
}

async function onTestConnection() {
  await testConnection()
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          {{ t('stripe.config.title') }}
        </h3>
        <UButton
          :icon="showSecrets ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="showSecrets ? t('stripe.config.hideKeys') : t('stripe.config.showKeys')"
          @click="showSecrets = !showSecrets"
        />
      </div>
    </template>

    <UForm
      :schema="ConfigSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        :label="t('stripe.config.fields.secretKey.label')"
        name="secretKey"
        :help="t('stripe.config.fields.secretKey.help')"
        required
      >
        <UInput
          v-model="state.secretKey"
          :type="showSecrets ? 'text' : 'password'"
          placeholder="sk_test_..."
          icon="i-heroicons-key"
        />
      </UFormField>

      <UFormField
        :label="t('stripe.config.fields.publishableKey.label')"
        name="publishableKey"
        :help="t('stripe.config.fields.publishableKey.help')"
        required
      >
        <UInput
          v-model="state.publishableKey"
          :type="showSecrets ? 'text' : 'password'"
          placeholder="pk_test_..."
          icon="i-heroicons-globe-alt"
        />
      </UFormField>

      <UFormField
        :label="t('stripe.config.fields.webhookSecret.label')"
        name="webhookSecret"
        :help="t('stripe.config.fields.webhookSecret.help')"
        required
      >
        <UInput
          v-model="state.webhookSecret"
          :type="showSecrets ? 'text' : 'password'"
          placeholder="whsec_..."
          icon="i-heroicons-shield-check"
        />
      </UFormField>

      <div class="flex justify-end gap-3">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          :loading="testing"
          :disabled="loading || testing"
          @click="onTestConnection"
        >
          {{ t('stripe.config.buttons.testConnection') }}
        </UButton>
        <UButton
          type="submit"
          color="primary"
          :loading="loading"
          :disabled="loading || testing"
        >
          {{ t('stripe.config.buttons.save') }}
        </UButton>
      </div>
    </UForm>
  </UCard>
</template>
