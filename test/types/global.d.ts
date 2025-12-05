import type { Ref, ComputedRef, WatchCallback } from 'vue'

declare global {
  // Vue composables globaux pour les tests
  var ref: typeof import('vue')['ref']
  var computed: typeof import('vue')['computed']
  var watch: typeof import('vue')['watch']

  // Composables Nuxt globaux pour les tests
  var useContentI18n: () => {
    t: (key: string, params?: Record<string, unknown>) => string
  }
}

export {}
