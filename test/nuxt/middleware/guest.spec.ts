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
const guestMiddleware = await import('~/middleware/guest')

describe('Guest Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserSession.loggedIn.value = false
    mockUserSession.user.value = null
  })

  describe('Unauthenticated User', () => {
    it('allows access for unauthenticated users', async () => {
      const mockTo = {
        fullPath: '/login',
        path: '/login',
        name: 'login',
        params: {},
        query: {},
        hash: '',
        meta: {},
        matched: [],
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = null

      const result = await guestMiddleware.default(mockTo, {} as MockRoute)

      expect(mockNavigateTo).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('allows access to signup page when not authenticated', async () => {
      const mockTo = {
        fullPath: '/signup',
        path: '/signup',
        name: 'signup',
        params: {},
        query: {},
        hash: '',
        meta: {},
        matched: [],
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = null

      const result = await guestMiddleware.default(mockTo, {} as MockRoute)

      expect(mockNavigateTo).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('allows access when loggedIn is false even if user exists', async () => {
      const mockTo = {
        fullPath: '/login',
        path: '/login',
        name: 'login',
        params: {},
        query: {},
        hash: '',
        meta: {},
        matched: [],
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = false
      // Simulating edge case where user object exists but not logged in
      mockUserSession.user.value = { id: '1', email: 'test@example.com' }

      const result = await guestMiddleware.default(mockTo, {} as MockRoute)

      expect(mockNavigateTo).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('allows access when user is null even if loggedIn is true', async () => {
      const mockTo = {
        fullPath: '/login',
        path: '/login',
        name: 'login',
        params: {},
        query: {},
        hash: '',
        meta: {},
        matched: [],
      } as RouteLocationNormalized

      mockUserSession.loggedIn.value = true
      mockUserSession.user.value = null

      const result = await guestMiddleware.default(mockTo, {} as MockRoute)

      expect(mockNavigateTo).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })
  })

  describe('Authenticated User', () => {
    it('redirects to dashboard when user is authenticated', async () => {
      const mockTo = {
        fullPath: '/login',
        path: '/login',
        name: 'login',
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

      await guestMiddleware.default(mockTo, {} as MockRoute)

      expect(mockNavigateTo).toHaveBeenCalledWith('/dashboard')
    })

    it('redirects admin users from login to dashboard', async () => {
      const mockTo = {
        fullPath: '/login',
        path: '/login',
        name: 'login',
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

      await guestMiddleware.default(mockTo, {} as MockRoute)

      expect(mockNavigateTo).toHaveBeenCalledWith('/dashboard')
    })

    it('redirects contributor users from signup to dashboard', async () => {
      const mockTo = {
        fullPath: '/signup',
        path: '/signup',
        name: 'signup',
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

      await guestMiddleware.default(mockTo, {} as MockRoute)

      expect(mockNavigateTo).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('Edge Cases', () => {
    it('redirects from any guest-only route when authenticated', async () => {
      const mockTo = {
        fullPath: '/forgot-password',
        path: '/forgot-password',
        name: 'forgot-password',
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

      await guestMiddleware.default(mockTo, {} as MockRoute)

      expect(mockNavigateTo).toHaveBeenCalledWith('/dashboard')
    })

    it('preserves authentication state across navigation', async () => {
      const mockTo = {
        fullPath: '/login',
        path: '/login',
        name: 'login',
        params: {},
        query: {},
        hash: '',
        meta: {},
        matched: [],
      } as RouteLocationNormalized

      // First call - not authenticated
      mockUserSession.loggedIn.value = false
      mockUserSession.user.value = null
      let result = await guestMiddleware.default(mockTo, {} as MockRoute)
      expect(mockNavigateTo).not.toHaveBeenCalled()
      expect(result).toBeUndefined()

      vi.clearAllMocks()

      // Second call - now authenticated
      mockUserSession.loggedIn.value = true
      mockUserSession.user.value = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'User',
      }
      result = await guestMiddleware.default(mockTo, {} as MockRoute)
      expect(mockNavigateTo).toHaveBeenCalledWith('/dashboard')
    })
  })
})
