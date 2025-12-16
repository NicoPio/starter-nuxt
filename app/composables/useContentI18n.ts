export const useContentI18n = () => {
  // Detect locale from cookie, navigator.language, or fallback to 'fr'
  const getInitialLocale = (): 'en' | 'fr' => {
    if (import.meta.client) {
      // Check cookie first
      const cookieLocale = document.cookie.split('; ').find(row => row.startsWith('i18n_locale='))
      if (cookieLocale) {
        const value = cookieLocale.split('=')[1] as 'en' | 'fr'
        if (value === 'en' || value === 'fr') return value
      }

      // Check navigator.language
      const browserLang = navigator.language.toLowerCase()
      if (browserLang.startsWith('en')) return 'en'
      if (browserLang.startsWith('fr')) return 'fr'
    }

    // Default fallback
    return 'fr'
  }

  const locale = useState<'en' | 'fr'>('locale', getInitialLocale)
  const translations = useState<Record<string, Record<string, unknown>>>('translations', () => ({}))

  const loadTranslations = async (newLocale: 'en' | 'fr') => {
    try {
      const modules = ['app', 'nav', 'auth', 'profile', 'dashboard', 'subscription', 'admin', 'errors', 'error', 'homepage', 'features', 'seo', 'accessibility', 'common', 'stripe']
      const result: Record<string, Record<string, unknown>> = {}

      // Load all translations in parallel
      const promises = modules.map(async (module) => {
        const collectionName = `i18n_${newLocale}_${module}`
        try {
          // @ts-expect-error - queryCollection n'a pas de type strict pour les collections dynamiques
          const data = await queryCollection(collectionName).first()
          return { module, data }
        } catch (err) {
          console.error(`[i18n] Failed to load ${collectionName}:`, err)
          return { module, data: null }
        }
      })

      const results = await Promise.all(promises)

      for (const { module, data} of results) {
        if (data && data.meta) {
          // Extract the actual translation data from the meta object
          result[module] = data.meta as Record<string, unknown>
        }
      }
      translations.value = result
      locale.value = newLocale

      if (import.meta.client) {
        document.cookie = `i18n_locale=${newLocale}; path=/; max-age=31536000`
      }
    } catch (error) {
      console.error('[i18n] Failed to load translations:', error)
    }
  }

  const interpolate = (text: string, params?: Record<string, string | number>): string => {
    if (!params) return text
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match
    })
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    const parts = key.split('.')
    let value: unknown = translations.value

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part]
      } else {
        console.warn(`Translation key not found: ${key}`)
        return key
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`)
      return key
    }

    return interpolate(value, params)
  }

  const setLocale = async (newLocale: 'en' | 'fr') => {
    await loadTranslations(newLocale)
  }

  return {
    t,
    locale: readonly(locale),
    setLocale,
    loadTranslations,
  }
}
