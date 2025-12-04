export default defineAppConfig({
  ui: {
    // Forcer le mode clair uniquement
    colorMode: {
      preference: 'light',
      fallback: 'light',
      storageKey: 'nuxt-color-mode'
    },

    colors: {
      primary: 'blue',
      secondary: 'violet',
      success: 'emerald',
      warning: 'amber',
      error: 'rose'
    },

    button: {
      slots: {
        base: 'font-semibold text-base transition-all duration-200 hover:scale-105'
      },
      variants: {
        size: {
          xs: 'text-sm px-3 py-1.5',
          sm: 'text-sm px-4 py-2',
          md: 'text-base px-5 py-2.5',
          lg: 'text-lg px-6 py-3',
          xl: 'text-xl px-8 py-4'
        }
      }
    },

    card: {
      slots: {
        root: 'rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 bg-white',
        header: 'px-6 py-5 font-bold text-xl border-b border-gray-100 dark:border-gray-800 bg-gray-50/50',
        body: 'px-6 py-5 text-base leading-relaxed bg-white',
        footer: 'px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50'
      }
    },

    input: {
      slots: {
        base: 'text-base',
        root: 'rounded-lg'
      },
      variants: {
        size: {
          sm: 'text-sm px-3 py-2',
          md: 'text-base px-4 py-2.5',
          lg: 'text-lg px-5 py-3'
        }
      }
    },

    badge: {
      slots: {
        base: 'font-semibold text-sm px-3 py-1 rounded-full'
      }
    },

    modal: {
      slots: {
        overlay: 'backdrop-blur-sm',
        base: 'rounded-2xl shadow-2xl'
      }
    },

    dropdown: {
      slots: {
        base: 'rounded-xl shadow-xl border-0',
        item: 'text-base py-2.5'
      }
    },

    container: {
      base: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
    }
  }
})
