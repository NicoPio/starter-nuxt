import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'

// Type helper for creating mock route objects
type MockRoute = Partial<RouteLocationNormalized>

// Mock dependencies - reactive values
const mockUserSession = {
  loggedIn: { value: false },
  user: { value: null },
}

const mockNavigateTo = vi.fn()

// CRITICAL: Mock global functions BEFORE any middleware import
// @ts-expect-error - Global mock for Nuxt auto-imports
global.defineNuxtRouteMiddleware = (fn: (...args: unknown[]) => unknown) => fn
// @ts-expect-error - Global mock for nuxt-auth-utils
global.useUserSession = () => mockUserSession
// @ts-expect-error - Global mock for Nuxt navigation
global.navigateTo = mockNavigateTo

// Import AFTER global mocks are set
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
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = null

      await authMiddleware.default(mockTo, {} as MockRoute)

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
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = null

      await authMiddleware.default(mockTo, {} as MockRoute)

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
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = { id: '1', email: 'test@example.com' }

      await authMiddleware.default(mockTo, {} as MockRoute)

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
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = true
      mockUserSession.user.value = null

      await authMiddleware.default(mockTo, {} as MockRoute)

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
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = true
      mockUserSession.user.value = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'User',
      }

      const result = await authMiddleware.default(mockTo, {} as MockRoute)

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
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = true
      mockUserSession.user.value = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'Admin',
      }

      const result = await authMiddleware.default(mockTo, {} as MockRoute)

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
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = true
      mockUserSession.user.value = {
        id: '1',
        email: 'contributor@example.com',
        name: 'Contributor User',
        role: 'Contributor',
      }

      const result = await authMiddleware.default(mockTo, {} as MockRoute)

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
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = null

      await authMiddleware.default(mockTo, {} as MockRoute)

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
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = null

      await authMiddleware.default(mockTo, {} as MockRoute)

      expect(mockNavigateTo).toHaveBeenCalledWith({
        path: '/login',
        query: {
          redirect: '/profile#settings',
        },
      })
    })
  })
})
