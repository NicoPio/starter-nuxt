<script setup lang="ts">
const { config, isConfigured, mode, isTestMode, isProductionMode } = useStripeConfig()
const { t } = useContentI18n()

const statusColor = computed(() => {
  if (!isConfigured.value) return 'neutral'
  return isTestMode.value ? 'warning' : 'success'
})

const statusIcon = computed(() => {
  if (!isConfigured.value) return 'i-heroicons-exclamation-triangle'
  return 'i-heroicons-check-circle'
})

const statusText = computed(() => {
  if (!isConfigured.value) return t('stripe.status.notConfigured')
  return isTestMode.value
    ? t('stripe.status.testMode')
    : t('stripe.status.productionMode')
})
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('stripe.status.title') }}
      </h3>
    </template>

    <div class="space-y-4">
      <!-- Status Badge -->
      <div class="flex items-center gap-3">
        <UIcon :name="statusIcon" :class="`text-${statusColor}-500`" class="w-6 h-6" />
        <div class="flex-1">
          <p class="font-medium">{{ statusText }}</p>
          <p v-if="isConfigured && mode" class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('stripe.status.modeLabel') }}: <span class="font-mono">{{ mode }}</span>
          </p>
        </div>
        <UBadge :color="statusColor" variant="subtle" size="lg">
          {{ isConfigured ? t('stripe.status.connected') : t('stripe.status.disconnected') }}
        </UBadge>
      </div>

      <!-- Configuration Details (only if configured) -->
      <div v-if="config" class="border-t pt-4 space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-gray-600 dark:text-gray-400">{{ t('stripe.status.publishableKey') }}:</span>
          <span class="font-mono text-xs">{{ config.publishableKey }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-600 dark:text-gray-400">{{ t('stripe.status.webhookSecret') }}:</span>
          <span class="font-mono text-xs">{{ config.webhookSecret }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-600 dark:text-gray-400">{{ t('stripe.status.lastUpdate') }}:</span>
          <span class="text-xs">{{ new Date(config.updatedAt).toLocaleString('fr-FR') }}</span>
        </div>
      </div>

      <!-- Warning for Test Mode -->
      <UAlert
        v-if="isTestMode"
        icon="i-heroicons-exclamation-triangle"
        color="warning"
        variant="soft"
        :title="t('stripe.status.testModeWarning.title')"
        :description="t('stripe.status.testModeWarning.description')"
      />

      <!-- Production Mode Info -->
      <UAlert
        v-if="isProductionMode"
        icon="i-heroicons-shield-check"
        color="success"
        variant="soft"
        :title="t('stripe.status.productionModeInfo.title')"
        :description="t('stripe.status.productionModeInfo.description')"
      />

      <!-- Not Configured Info -->
      <UAlert
        v-if="!isConfigured"
        icon="i-heroicons-information-circle"
        color="info"
        variant="soft"
        :title="t('stripe.status.notConfiguredInfo.title')"
        :description="t('stripe.status.notConfiguredInfo.description')"
      />
    </div>
  </UCard>
</template>
