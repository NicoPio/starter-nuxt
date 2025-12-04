<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

const { t } = useContentI18n()
const {
  subscription,
  loading,
  cancelling,
  fetchSubscription,
  cancelSubscription
} = useSubscription()

const showCancelDialog = ref(false)

onMounted(async () => {
  await fetchSubscription()
})

const handleCancelClick = () => {
  showCancelDialog.value = true
}

const handleCancelConfirm = async () => {
  const { error } = await cancelSubscription()

  if (!error) {
    showCancelDialog.value = false
  }
}

useSeoMeta({
  title: t('subscription.title'),
  description: t('subscription.description')
})
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ t('subscription.heading') }}
      </h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        {{ t('subscription.subheading') }}
      </p>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <div v-else-if="subscription" class="space-y-6">
      <SubscriptionSubscriptionCard
        :subscription="subscription"
        @cancel="handleCancelClick"
      />

      <UCard v-if="subscription.plan_type !== 'free'">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('subscription.billing.title') }}
          </h3>
        </template>

        <div class="space-y-3">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('subscription.billing.description') }}
          </p>

          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-credit-card" class="h-5 w-5 text-gray-400" />
            <span class="text-sm text-gray-700 dark:text-gray-300">
              {{ t('subscription.billing.managePayment') }}
            </span>
          </div>
        </div>

        <template #footer>
          <UButton color="neutral" variant="outline" disabled>
            {{ t('subscription.billing.button') }}
          </UButton>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('subscription.plans.title') }}
          </h3>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="plan in ['free', 'pro', 'enterprise']"
            :key="plan"
            class="p-4 rounded-lg border-2"
            :class="{
              'border-primary-500 bg-primary-50 dark:bg-primary-900/20': subscription.plan_type === plan,
              'border-gray-200 dark:border-gray-700': subscription.plan_type !== plan
            }"
          >
            <h4 class="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {{ plan }}
            </h4>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {{ t(`subscription.plans.${plan}.description`) }}
            </p>

            <div class="mt-4">
              <UBadge
                v-if="subscription.plan_type === plan"
                color="primary"
                variant="subtle"
              >
                {{ t('subscription.plans.current') }}
              </UBadge>
              <UButton
                v-else
                size="sm"
                variant="outline"
                disabled
              >
                {{ t('subscription.plans.selectButton') }}
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <div v-else class="text-center py-12">
      <p class="text-gray-600 dark:text-gray-400">
        {{ t('subscription.noSubscription') }}
      </p>
    </div>

    <SubscriptionCancelDialog
      v-model="showCancelDialog"
      :loading="cancelling"
      @confirm="handleCancelConfirm"
    />
  </div>
</template>
