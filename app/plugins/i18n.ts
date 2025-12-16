export default defineNuxtPlugin({
  name: 'i18n',
  async setup(_nuxtApp) {
    // Détecter la locale cible AVANT d'initialiser useContentI18n
    let targetLocale: 'en' | 'fr' = 'fr' // Default fallback

    if (import.meta.client) {
      // 1. Vérifier le cookie en premier
      const cookieLocale = document.cookie
        .split('; ')
        .find(row => row.startsWith('i18n_locale='))
        ?.split('=')[1] as 'en' | 'fr' | undefined

      if (cookieLocale && (cookieLocale === 'en' || cookieLocale === 'fr')) {
        targetLocale = cookieLocale
      } else {
        // 2. Utiliser la langue du navigateur si pas de cookie
        const browserLang = navigator.language.toLowerCase()
        if (browserLang.startsWith('en')) {
          targetLocale = 'en'
        } else if (browserLang.startsWith('fr')) {
          targetLocale = 'fr'
        }
      }
    }

    const { t, locale, setLocale, loadTranslations } = useContentI18n()

    // Charger les traductions pour la locale détectée
    await loadTranslations(targetLocale)

    return {
      provide: {
        t,
        locale,
        setLocale,
      }
    }
  }
})
