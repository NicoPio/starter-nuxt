export default defineNuxtPlugin({
  name: 'i18n',
  async setup(_nuxtApp) {
    const { t, locale, setLocale, loadTranslations } = useContentI18n()

    // Détecter la locale depuis le cookie ou le navigateur côté client
    if (import.meta.client) {
      const cookieLocale = document.cookie
        .split('; ')
        .find(row => row.startsWith('i18n_locale='))
        ?.split('=')[1] as 'en' | 'fr' | undefined

      if (cookieLocale && (cookieLocale === 'en' || cookieLocale === 'fr')) {
        // Ne pas mettre à jour locale ici, c'est déjà fait dans useContentI18n
      } else {
        const browserLang = navigator.language.split('-')[0]
        if (browserLang === 'en' || browserLang === 'fr') {
          // Charger avec la langue du navigateur si pas de cookie
          await loadTranslations(browserLang as 'en' | 'fr')
        }
      }
    }

    // Charger les traductions pour garantir qu'elles sont disponibles en SSR
    await loadTranslations(locale.value)

    return {
      provide: {
        t,
        locale,
        setLocale,
      }
    }
  }
})
