import type { Ref } from 'vue'
import type { StripeConfigResponse, StripeTestConnectionResponse } from '~/types/stripe.types'

export const useStripeConfig = () => {
  const config: Ref<StripeConfigResponse | null> = useState('stripe-config', () => null)
  const loading = ref(false)
  const testing = ref(false)
  const toast = useToast()
  const { t } = useContentI18n()

  /**
   * Récupère la configuration Stripe actuelle
   */
  const fetchConfig = async () => {
    loading.value = true
    try {
      const data = await $fetch<StripeConfigResponse | null>('/api/admin/stripe/config')
      config.value = data
      return { data, error: null }
    } catch (error: unknown) {
      console.error('[useStripeConfig] Fetch error:', error)
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  /**
   * Sauvegarde une nouvelle configuration Stripe
   */
  const saveConfig = async (data: {
    secretKey: string
    publishableKey: string
    webhookSecret: string
  }) => {
    loading.value = true
    try {
      const result = await $fetch('/api/admin/stripe/config', {
        method: 'POST',
        body: data,
      })

      // Recharger la configuration après sauvegarde
      await fetchConfig()

      toast.add({
        title: t('stripe.config.save.success'),
        description: t('stripe.config.save.successMessage'),
        color: 'success',
      })

      return { data: result, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : t('stripe.config.save.errorGeneric')

      toast.add({
        title: t('stripe.config.save.error'),
        description: message,
        color: 'error',
      })

      console.error('[useStripeConfig] Save error:', error)
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  /**
   * Teste la connexion à Stripe
   */
  const testConnection = async (): Promise<{
    data: StripeTestConnectionResponse | null
    error: unknown
  }> => {
    testing.value = true
    try {
      const data = await $fetch<StripeTestConnectionResponse>('/api/admin/stripe/test-connection', {
        method: 'POST',
      })

      if (data.success) {
        toast.add({
          title: t('stripe.config.test.success'),
          description: t('stripe.config.test.successMessage', { mode: data.mode }),
          color: 'success',
        })
      } else {
        toast.add({
          title: t('stripe.config.test.error'),
          description: data.error || t('stripe.config.test.errorGeneric'),
          color: 'error',
        })
      }

      return { data, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : t('stripe.config.test.errorGeneric')

      toast.add({
        title: t('stripe.config.test.error'),
        description: message,
        color: 'error',
      })

      console.error('[useStripeConfig] Test connection error:', error)
      return { data: null, error }
    } finally {
      testing.value = false
    }
  }

  const isConfigured = computed(() => config.value !== null)
  const mode = computed(() => config.value?.mode || null)
  const isTestMode = computed(() => mode.value === 'test')
  const isProductionMode = computed(() => mode.value === 'production')

  return {
    config,
    loading,
    testing,
    fetchConfig,
    saveConfig,
    testConnection,
    isConfigured,
    mode,
    isTestMode,
    isProductionMode,
  }
}
