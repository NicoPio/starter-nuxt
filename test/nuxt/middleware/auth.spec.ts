import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockUserSession = {
  loggedIn: { value: false },
  user: { value: null },
}

const mockNavigateTo = vi.fn()

// Mock global composables
vi.mock('#app', () => ({
  defineNuxtRouteMiddleware: (fn: Function) => fn,
  useUserSession: () => mockUserSession,
  navigateTo: (options: unknown) => mockNavigateTo(options),
}))

// Import after mocking
const authMiddleware = await import('~/middleware/auth')

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserSession.loggedIn.value = false
    mockUserSession.user.value = null
  })

  describe('Unauthenticated User', () => {
    it('redirects to login when user is not authenticated', async () => {
      const mockTo = {
        fullPath: '/protected-route',
        path: '/protected-route',
        name: 'protected',
        params: {},
        query: {},
        hash: '',
        meta: {},
        matched: [],
      }

      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = null

      await authMiddleware.default(mockTo, {} as any)

      expect(mockNavigateTo).toHaveBeenCalledWith({
        path: '/login',
        query: {
          redirect: '/protected-route',
        },
      })
    })

    it('preserves query parameters in redirect', async () => {
      const mockTo = {
        fullPath: '/protected-route?foo=bar&baz=qux',
        path: '/protected-route',
        name: 'protected',
        params: {},
        query: { foo: 'bar', baz: 'qux' },
        hash: '',
        meta: {},
        matched: [],
      }

      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = null

      await authMiddleware.default(mockTo, {} as any)

      expect(mockNavigateTo).toHaveBeenCalledWith({
        path: '/login',
        query: {
          redirect: '/protected-route?foo=bar&baz=qux',
        },
      })
    })

    it('redirects when loggedIn is false even if user exists', async () => {
      const mockTo = {
        fullPath: '/dashboard',
        path: '/dashboard',
        name: 'dashboard',
        params: {},
        query: {},
        hash: '',
        meta: {},
        matched: [],
      }

      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = { id: '1', email: 'test@example.com' }

      await authMiddleware.default(mockTo, {} as any)

      expect(mockNavigateTo).toHaveBeenCalledWith({
        path: '/login',
        query: {
          redirect: '/dashboard',
        },
      })
    })

    it('redirects when user is null even if loggedIn is true', async () => {
      const mockTo = {
        fullPath: '/dashboard',
        path: '/dashboard',
        name: 'dashboard',
        params: {},
        query: {},
        hash: '',
        meta: {},
        matched: [],
      }

      mockUserSession.loggedIn.value = true
      mockUserSession.user.value = null

      await authMiddleware.default(mockTo, {} as any)

      expect(mockNavigateTo).toHaveBeenCalledWith({
        path: '/login',
        query: {
          redirect: '/dashboard',
        },
      })
    })
  })

  describe('Authenticated User', () => {
    it('allows access when user is authenticated', async () => {
      const mockTo = {
        fullPath: '/dashboard',
        path: '/dashboard',
        name: 'dashboard',
        params: {},
        query: {},
        hash: '',
        meta: {},
        matched: [],
      }

      mockUserSession.loggedIn.value = true
      mockUserSession.user.value = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'User',
      }

      const result = await authMiddleware.default(mockTo, {} as any)

      expect(mockNavigateTo).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('allows access for admin users', async () => {
      const mockTo = {
        fullPath: '/admin',
        path: '/admin',
        name: 'admin',
        params: {},
        query: {},
        hash: '',
        meta: {},
        matched: [],
      }

      mockUserSession.loggedIn.value = true
      mockUserSession.user.value = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'Admin',
      }

      const result = await authMiddleware.default(mockTo, {} as any)

      expect(mockNavigateTo).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('allows access for contributor users', async () => {
      const mockTo = {
        fullPath: '/content',
        path: '/content',
        name: 'content',
        params: {},
        query: {},
        hash: '',
        meta: {},
        matched: [],
      }

      mockUserSession.loggedIn.value = true
      mockUserSession.user.value = {
        id: '1',
        email: 'contributor@example.com',
        name: 'Contributor User',
        role: 'Contributor',
      }

      const result = await authMiddleware.default(mockTo, {} as any)

      expect(mockNavigateTo).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('handles root path redirect correctly', async () => {
      const mockTo = {
        fullPath: '/',
        path: '/',
        name: 'index',
        params: {},
        query: {},
        hash: '',
        meta: {},
        matched: [],
      }

      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = null

      await authMiddleware.default(mockTo, {} as any)

      expect(mockNavigateTo).toHaveBeenCalledWith({
        path: '/login',
        query: {
          redirect: '/',
        },
      })
    })

    it('handles hash fragments in redirect', async () => {
      const mockTo = {
        fullPath: '/profile#settings',
        path: '/profile',
        name: 'profile',
        params: {},
        query: {},
        hash: '#settings',
        meta: {},
        matched: [],
      }

      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = null

      await authMiddleware.default(mockTo, {} as any)

      expect(mockNavigateTo).toHaveBeenCalledWith({
        path: '/login',
        query: {
          redirect: '/profile#settings',
        },
      })
    })
  })
})
