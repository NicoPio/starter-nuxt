import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, readonly } from 'vue'

// Mock useState
const mockLocale = ref<'en' | 'fr'>('fr')
const mockTranslations = ref<Record<string, Record<string, unknown>>>({})

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
  }
})

vi.stubGlobal('useState', vi.fn((key: string, init?: () => any) => {
  if (key === 'locale') return mockLocale
  if (key === 'translations') return mockTranslations
  return ref(init ? init() : undefined)
}))

vi.stubGlobal('readonly', readonly)

// Mock queryCollection
const mockQueryCollection = vi.fn()
vi.stubGlobal('queryCollection', mockQueryCollection)

describe('useContentI18n', () => {
  let useContentI18n: any

  beforeEach(async () => {
    vi.resetModules()
    mockLocale.value = 'fr'
    mockTranslations.value = {}
    mockQueryCollection.mockReset()

    const module = await import('~/app/composables/useContentI18n')
    useContentI18n = module.useContentI18n
  })

  describe('interpolate function', () => {
    it('returns text unchanged when no params provided', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        common: {
          hello: 'Hello',
        },
      }

      const result = t('common.hello')

      expect(result).toBe('Hello')
    })

    it('interpolates single parameter', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        common: {
          greeting: 'Hello {name}',
        },
      }

      const result = t('common.greeting', { name: 'Alice' })

      expect(result).toBe('Hello Alice')
    })

    it('interpolates multiple parameters', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        common: {
          message: 'User {name} has {count} items',
        },
      }

      const result = t('common.message', { name: 'Bob', count: 5 })

      expect(result).toBe('User Bob has 5 items')
    })

    it('converts number parameters to strings', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        common: {
          counter: 'Count: {value}',
        },
      }

      const result = t('common.counter', { value: 42 })

      expect(result).toBe('Count: 42')
    })

    it('leaves placeholder unchanged when parameter is missing', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        common: {
          greeting: 'Hello {name}',
        },
      }

      const result = t('common.greeting', {})

      expect(result).toBe('Hello {name}')
    })

    it('handles empty string parameter', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        common: {
          greeting: 'Hello {name}',
        },
      }

      const result = t('common.greeting', { name: '' })

      expect(result).toBe('Hello ')
    })
  })

  describe('t function', () => {
    it('returns translation for valid key', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        auth: {
          login: {
            title: 'Connexion',
          },
        },
      }

      const result = t('auth.login.title')

      expect(result).toBe('Connexion')
    })

    it('returns key when translation not found', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        auth: {
          login: {},
        },
      }

      const result = t('auth.login.notfound')

      expect(result).toBe('auth.login.notfound')
    })

    it('returns key when module does not exist', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {}

      const result = t('nonexistent.key')

      expect(result).toBe('nonexistent.key')
    })

    it('returns key when value is not a string', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        auth: {
          login: {
            data: { nested: 'value' },
          },
        },
      }

      const result = t('auth.login.data')

      expect(result).toBe('auth.login.data')
    })

    it('handles nested object paths correctly', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        admin: {
          users: {
            messages: {
              success: 'Utilisateur créé',
            },
          },
        },
      }

      const result = t('admin.users.messages.success')

      expect(result).toBe('Utilisateur créé')
    })

    it('combines translation with parameter interpolation', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        admin: {
          users: {
            count: 'Total: {total} utilisateurs',
          },
        },
      }

      const result = t('admin.users.count', { total: 42 })

      expect(result).toBe('Total: 42 utilisateurs')
    })
  })

  describe('loadTranslations', () => {
    it('loads all translation modules', async () => {
      const { loadTranslations } = useContentI18n()

      const mockData = { meta: { title: 'Test' } }
      mockQueryCollection.mockReturnValue({
        first: vi.fn().mockResolvedValue(mockData),
      })

      await loadTranslations('en')

      expect(mockQueryCollection).toHaveBeenCalledWith('i18n_en_app')
      expect(mockQueryCollection).toHaveBeenCalledWith('i18n_en_auth')
      expect(mockQueryCollection).toHaveBeenCalledWith('i18n_en_admin')
    })

    it('updates locale after loading', async () => {
      const { loadTranslations } = useContentI18n()

      mockQueryCollection.mockReturnValue({
        first: vi.fn().mockResolvedValue({ meta: {} }),
      })

      await loadTranslations('en')

      expect(mockLocale.value).toBe('en')
    })

    it('sets translations from loaded data', async () => {
      const { loadTranslations } = useContentI18n()

      const appData = { meta: { title: 'App Title' } }
      const authData = { meta: { login: 'Login' } }

      mockQueryCollection.mockImplementation((name: string) => ({
        first: vi.fn().mockResolvedValue(
          name.includes('app') ? appData : authData
        ),
      }))

      await loadTranslations('en')

      expect(mockTranslations.value).toHaveProperty('app')
      expect(mockTranslations.value).toHaveProperty('auth')
    })

    it('handles collection loading errors gracefully', async () => {
      const { loadTranslations } = useContentI18n()

      mockQueryCollection.mockImplementation((name: string) => ({
        first: vi.fn().mockImplementation(() => {
          if (name.includes('app')) {
            return Promise.reject(new Error('Not found'))
          }
          return Promise.resolve({ meta: { test: 'value' } })
        }),
      }))

      await loadTranslations('en')

      // Should not throw and should load other modules
      expect(mockTranslations.value).toHaveProperty('auth')
    })

    it('handles null data from collection', async () => {
      const { loadTranslations } = useContentI18n()

      mockQueryCollection.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      })

      await loadTranslations('en')

      // Should not crash
      expect(mockLocale.value).toBe('en')
    })

    it('handles data without meta property', async () => {
      const { loadTranslations } = useContentI18n()

      mockQueryCollection.mockReturnValue({
        first: vi.fn().mockResolvedValue({ title: 'Test' }),
      })

      await loadTranslations('en')

      // Should not crash
      expect(mockLocale.value).toBe('en')
    })
  })

  describe('setLocale', () => {
    it('calls loadTranslations with new locale', async () => {
      const { setLocale } = useContentI18n()

      mockQueryCollection.mockReturnValue({
        first: vi.fn().mockResolvedValue({ meta: {} }),
      })

      await setLocale('en')

      expect(mockLocale.value).toBe('en')
    })

    it('switches from fr to en', async () => {
      const { setLocale } = useContentI18n()
      mockLocale.value = 'fr'

      mockQueryCollection.mockReturnValue({
        first: vi.fn().mockResolvedValue({ meta: {} }),
      })

      await setLocale('en')

      expect(mockLocale.value).toBe('en')
    })
  })

  describe('locale computed', () => {
    it('returns current locale value', () => {
      const { locale } = useContentI18n()

      expect(locale.value).toBe('fr')
    })

    it('reflects locale changes', async () => {
      const { locale, setLocale } = useContentI18n()

      mockQueryCollection.mockReturnValue({
        first: vi.fn().mockResolvedValue({ meta: {} }),
      })

      await setLocale('en')

      expect(locale.value).toBe('en')
    })
  })

  describe('edge cases', () => {
    it('handles empty translation key', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {}

      const result = t('')

      expect(result).toBe('')
    })

    it('handles single-level key', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        hello: 'Hello',
      }

      const result = t('hello')

      expect(result).toBe('Hello')
    })

    it('handles multiple consecutive placeholders', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        test: {
          message: '{a}{b}{c}',
        },
      }

      const result = t('test.message', { a: '1', b: '2', c: '3' })

      expect(result).toBe('123')
    })

    it('handles placeholder at start of string', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        test: {
          message: '{name} says hello',
        },
      }

      const result = t('test.message', { name: 'Alice' })

      expect(result).toBe('Alice says hello')
    })

    it('handles placeholder at end of string', () => {
      const { t } = useContentI18n()
      mockTranslations.value = {
        test: {
          message: 'Hello {name}',
        },
      }

      const result = t('test.message', { name: 'Bob' })

      expect(result).toBe('Hello Bob')
    })
  })
})
