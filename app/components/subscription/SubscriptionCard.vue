<script setup lang="ts">
import type { Subscription } from '~/types/common.types'

defineProps<{
  subscription: Subscription
}>()

const emit = defineEmits<{
  cancel: []
}>()

const { t } = useContentI18n()

const planColors: Record<string, 'neutral' | 'primary' | 'success'> = {
  free: 'neutral',
  pro: 'primary',
  enterprise: 'success'
}

const statusColors: Record<string, 'success' | 'warning' | 'error'> = {
  active: 'success',
  cancelled: 'warning',
  expired: 'error',
  past_due: 'error'
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('subscription.currentPlan') }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{ t('subscription.planDescription') }}
          </p>
        </div>
        <UBadge
          :color="planColors[subscription.plan_type as keyof typeof planColors]"
          size="lg"
          variant="subtle"
        >
          {{ subscription.plan_type }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('subscription.status') }}
        </span>
        <UBadge
          :color="statusColors[subscription.status as keyof typeof statusColors]"
          variant="subtle"
        >
          {{ t(`subscription.statuses.${subscription.status}`) }}
        </UBadge>
      </div>

      <div
        v-if="subscription.current_period_end"
        class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
      >
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ subscription.status === 'cancelled' ? t('subscription.expiresOn') : t('subscription.renewsOn') }}
        </span>
        <span class="text-sm text-gray-900 dark:text-white">
          {{ formatDate(subscription.current_period_end) }}
        </span>
      </div>

      <div
        v-if="subscription.cancel_at"
        class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
      >
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('subscription.cancelAt') }}
        </span>
        <span class="text-sm text-gray-900 dark:text-white">
          {{ formatDate(subscription.cancel_at) }}
        </span>
      </div>

      <div class="flex items-center justify-between py-3">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('subscription.planType') }}
        </span>
        <span class="text-sm font-semibold text-gray-900 dark:text-white capitalize">
          {{ subscription.plan_type }}
        </span>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          v-if="subscription.plan_type !== 'free' && subscription.status === 'active'"
          color="error"
          variant="outline"
          @click="emit('cancel')"
        >
          {{ t('subscription.cancel.button') }}
        </UButton>

        <UButton
          v-if="subscription.plan_type === 'free'"
          color="primary"
        >
          {{ t('subscription.upgrade.button') }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>
