import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '~/composables/useAuth'

// Mock dependencies
const mockToast = {
  add: vi.fn(),
}

const mockT = vi.fn((key: string, params?: Record<string, unknown>) => {
  const translations: Record<string, string> = {
    'auth.logout.success': 'Déconnexion réussie',
    'auth.logout.successMessage': 'Vous avez été déconnecté avec succès',
    'auth.logout.error': 'Erreur de déconnexion',
    'auth.logout.errorGeneric': 'Une erreur est survenue lors de la déconnexion',
  }
  return translations[key] || key
})

const mockUserSession = {
  loggedIn: { value: false },
  user: { value: null },
  session: { value: null },
  fetch: vi.fn(),
  clear: vi.fn(),
}

const mockNavigateTo = vi.fn()
const mockFetch = vi.fn()

// Mock global composables
vi.mock('#app', () => ({
  useToast: () => mockToast,
  navigateTo: (path: string, options?: unknown) => mockNavigateTo(path, options),
  useUserSession: () => mockUserSession,
}))

vi.mock('~/composables/useContentI18n', () => ({
  useContentI18n: () => ({ t: mockT }),
}))

// Mock global fetch
global.$fetch = mockFetch as typeof $fetch

describe('useAuth Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserSession.loggedIn.value = false
    mockUserSession.user.value = null
    mockUserSession.session.value = null
  })

  describe('State Management', () => {
    it('exposes isAuthenticated computed property', () => {
      const { isAuthenticated } = useAuth()
      expect(isAuthenticated.value).toBe(false)

      mockUserSession.loggedIn.value = true
      expect(isAuthenticated.value).toBe(true)
    })

    it('exposes user and session from useUserSession', () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', role: 'User' }
      mockUserSession.user.value = mockUser
      mockUserSession.session.value = { user: mockUser }

      const { user, session } = useAuth()
      expect(user.value).toEqual(mockUser)
      expect(session.value).toEqual({ user: mockUser })
    })
  })

  describe('signup', () => {
    it('creates a new user with email, password and name', async () => {
      const mockResponse = { user: { id: '1', email: 'new@example.com', name: 'New User' } }
      mockFetch.mockResolvedValueOnce(mockResponse)
      mockUserSession.fetch.mockResolvedValueOnce(undefined)

      const { signup } = useAuth()
      const result = await signup('new@example.com', 'password123', 'New User')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        body: {
          email: 'new@example.com',
          password: 'password123',
          name: 'New User',
        },
      })
      expect(mockUserSession.fetch).toHaveBeenCalled()
      expect(result.data).toEqual(mockResponse)
      expect(result.error).toBeNull()
    })

    it('defaults name to email prefix if not provided', async () => {
      const mockResponse = { user: { id: '1', email: 'new@example.com', name: 'new' } }
      mockFetch.mockResolvedValueOnce(mockResponse)
      mockUserSession.fetch.mockResolvedValueOnce(undefined)

      const { signup } = useAuth()
      await signup('new@example.com', 'password123')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        body: {
          email: 'new@example.com',
          password: 'password123',
          name: 'new',
        },
      })
    })

    it('handles signup errors gracefully', async () => {
      const mockError = new Error('Email already exists')
      mockFetch.mockRejectedValueOnce(mockError)

      const { signup } = useAuth()
      const result = await signup('existing@example.com', 'password123')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
      expect(mockUserSession.fetch).not.toHaveBeenCalled()
    })
  })

  describe('login', () => {
    it('logs in a user with email and password', async () => {
      const mockResponse = { user: { id: '1', email: 'test@example.com', name: 'Test User' } }
      mockFetch.mockResolvedValueOnce(mockResponse)
      mockUserSession.fetch.mockResolvedValueOnce(undefined)

      const { login } = useAuth()
      const result = await login('test@example.com', 'password123')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      })
      expect(mockUserSession.fetch).toHaveBeenCalled()
      expect(result.data).toEqual(mockResponse)
      expect(result.error).toBeNull()
    })

    it('handles login errors gracefully', async () => {
      const mockError = new Error('Invalid credentials')
      mockFetch.mockRejectedValueOnce(mockError)

      const { login } = useAuth()
      const result = await login('test@example.com', 'wrongpassword')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
      expect(mockUserSession.fetch).not.toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    beforeEach(() => {
      // Mock setTimeout for logout
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('logs out a user successfully', async () => {
      mockFetch.mockResolvedValueOnce({ success: true })
      mockUserSession.clear.mockResolvedValueOnce(undefined)
      mockNavigateTo.mockResolvedValueOnce(undefined)

      const { logout } = useAuth()
      const resultPromise = logout()

      // Fast-forward timers to resolve setTimeout
      await vi.runAllTimersAsync()

      const result = await resultPromise

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
      })
      expect(mockUserSession.clear).toHaveBeenCalled()
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'Déconnexion réussie',
        description: 'Vous avez été déconnecté avec succès',
        color: 'success',
      })
      expect(mockNavigateTo).toHaveBeenCalledWith('/', { replace: true })
      expect(result.error).toBeNull()
    })

    it('handles logout errors gracefully', async () => {
      const mockError = new Error('Logout failed')
      mockFetch.mockRejectedValueOnce(mockError)

      const { logout } = useAuth()
      const result = await logout()

      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'Erreur de déconnexion',
        description: 'Logout failed',
        color: 'error',
      })
      expect(result.error).toEqual(mockError)
      expect(mockNavigateTo).not.toHaveBeenCalled()
    })

    it('shows generic error message for non-Error objects', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error')

      const { logout } = useAuth()
      const result = await logout()

      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'Erreur de déconnexion',
        description: 'Une erreur est survenue lors de la déconnexion',
        color: 'error',
      })
      expect(result.error).toEqual('Unknown error')
    })
  })

  describe('Integration', () => {
    it('provides all expected properties and methods', () => {
      const auth = useAuth()

      expect(auth).toHaveProperty('user')
      expect(auth).toHaveProperty('session')
      expect(auth).toHaveProperty('isAuthenticated')
      expect(auth).toHaveProperty('signup')
      expect(auth).toHaveProperty('login')
      expect(auth).toHaveProperty('logout')
    })
  })
})
