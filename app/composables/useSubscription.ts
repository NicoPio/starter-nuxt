import type { Subscription } from '~/types/common.types'

interface CancelSubscriptionResponse {
  subscription: Subscription
}

export const useSubscription = () => {
  const toast = useToast()
  const { t } = useContentI18n()

  const subscription = ref<Subscription | null>(null)
  const loading = ref(false)
  const cancelling = ref(false)

  const fetchSubscription = async () => {
    loading.value = true
    try {
      const data = await $fetch<Subscription>('/api/subscriptions/me')
      subscription.value = data
      return { data, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch subscription'
      toast.add({
        title: t('subscription.error'),
        description: message,
        color: 'error'
      })
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  const cancelSubscription = async () => {
    cancelling.value = true
    try {
      const data = await $fetch<CancelSubscriptionResponse>('/api/subscriptions/cancel', {
        method: 'POST',
        body: { confirm: true }
      })

      subscription.value = data.subscription

      toast.add({
        title: t('subscription.cancel.success'),
        description: t('subscription.cancel.successMessage'),
        color: 'success'
      })

      return { data, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('subscription.cancel.errorGeneric')
      toast.add({
        title: t('subscription.cancel.error'),
        description: message,
        color: 'error'
      })
      return { data: null, error }
    } finally {
      cancelling.value = false
    }
  }

  const isActive = computed(() => subscription.value?.status === 'active')
  const isCancelled = computed(() => subscription.value?.status === 'cancelled')
  const isPastDue = computed(() => subscription.value?.status === 'past_due')
  const isFree = computed(() => subscription.value?.plan_type === 'free')
  const isPro = computed(() => subscription.value?.plan_type === 'pro')
  const isEnterprise = computed(() => subscription.value?.plan_type === 'enterprise')

  return {
    subscription,
    loading,
    cancelling,
    fetchSubscription,
    cancelSubscription,
    isActive,
    isCancelled,
    isPastDue,
    isFree,
    isPro,
    isEnterprise
  }
}
