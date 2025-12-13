import type { UserWithRole } from '~/types/common.types'
import { createMockUser, createMockSession } from './factories'

/**
 * Utilitaires pour gérer l'authentification dans les tests
 */

/**
 * Mock de l'état d'authentification pour les tests unitaires
 */
export function mockAuthState(user: UserWithRole | null = null) {
  const mockUser = user ?? createMockUser()
  const mockSession = user ? createMockSession(user.id) : null

  return {
    user: ref(user),
    session: ref(mockSession),
    loading: ref(false),
    error: ref<Error | null>(null),
    isAuthenticated: computed(() => !!user),
    signIn: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
    signOut: vi.fn().mockResolvedValue({ data: null, error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
    fetchUser: vi.fn().mockResolvedValue(mockUser),
  }
}

/**
 * Mock du composable useAuth
 */
export function mockUseAuth(user: UserWithRole | null = null) {
  const authState = mockAuthState(user)

  vi.mock('~/composables/useAuth', () => ({
    useAuth: () => authState,
  }))

  return authState
}

/**
 * Mock du composable useRole avec un utilisateur ayant un rôle spécifique
 */
export function mockUseRole(role: 'user' | 'contributor' | 'admin' = 'user') {
  const user = createMockUser({ role })

  const roleState = {
    isAdmin: computed(() => role === 'admin'),
    isContributor: computed(() => role === 'contributor' || role === 'admin'),
    isUser: computed(() => true),
    hasRole: vi.fn((requiredRole: string) => {
      const roleHierarchy = { user: 0, contributor: 1, admin: 2 }
      return roleHierarchy[role] >= roleHierarchy[requiredRole as keyof typeof roleHierarchy]
    }),
    canManageUsers: computed(() => role === 'admin' || role === 'contributor'),
    canEditRoles: computed(() => role === 'admin'),
    canDeleteUsers: computed(() => role === 'admin'),
  }

  vi.mock('~/composables/useRole', () => ({
    useRole: () => roleState,
  }))

  return { user, roleState }
}

/**
 * Crée un header d'authentification pour les tests API
 */
export function createAuthHeader(sessionToken: string = 'test-session-token') {
  return {
    cookie: `nuxt-session=${sessionToken}`,
  }
}

/**
 * Mock d'un utilisateur authentifié pour les tests de composants
 */
export function setupAuthenticatedUser(user: Partial<UserWithRole> = {}) {
  const mockUser = createMockUser(user)
  return mockUseAuth(mockUser)
}

/**
 * Mock d'un utilisateur non authentifié
 */
export function setupUnauthenticatedUser() {
  return mockUseAuth(null)
}

/**
 * Mock d'un Admin authentifié
 */
export function setupAuthenticatedAdmin(overrides: Partial<UserWithRole> = {}) {
  const mockUser = createMockUser({ role: 'admin', ...overrides })
  return mockUseAuth(mockUser)
}

/**
 * Mock d'un Contributor authentifié
 */
export function setupAuthenticatedContributor(overrides: Partial<UserWithRole> = {}) {
  const mockUser = createMockUser({ role: 'contributor', ...overrides })
  return mockUseAuth(mockUser)
}

/**
 * Nettoie tous les mocks d'authentification
 */
export function clearAuthMocks() {
  vi.clearAllMocks()
  vi.resetModules()
}

/**
 * Simule une erreur d'authentification
 */
export function mockAuthError(errorMessage: string = 'Authentication failed') {
  const authState = mockAuthState(null)
  authState.error.value = new Error(errorMessage)
  authState.signIn = vi.fn().mockResolvedValue({ data: null, error: new Error(errorMessage) })
  authState.signUp = vi.fn().mockResolvedValue({ data: null, error: new Error(errorMessage) })
  return authState
}

/**
 * Simule un état de chargement
 */
export function mockAuthLoading() {
  const authState = mockAuthState(null)
  authState.loading.value = true
  return authState
}

/**
 * Mock Resend pour éviter l'envoi de vrais emails dans les tests E2E
 */
export async function mockResend(page: any) {
  await page.addInitScript(() => {
    // @ts-ignore
    window.mockedResendCalls = []
    
    // Mock the global fetch to intercept Resend API calls
    const originalFetch = window.fetch
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      if (typeof input === 'string' && input.includes('api.resend.com')) {
        // @ts-ignore
        window.mockedResendCalls.push({
          url: input,
          method: init?.method || 'POST',
          body: init?.body ? JSON.parse(init.body) : null,
          to: 'mocked@example.com', // Default, will be extracted from body
          html: init?.body || '',
        })
        
        // Extract email from body if present
        if (init?.body) {
          try {
            const body = JSON.parse(init.body)
            if (body.to) {
              const lastCallIndex = window.mockedResendCalls.length - 1
              // @ts-ignore
              window.mockedResendCalls[lastCallIndex].to = body.to
            }
          } catch (e) {
            console.log('Could not parse Resend request body:', e)
          }
        }
        
        // Return mock success response
        return new Response(JSON.stringify({
          data: { id: 'mock-message-id' },
          error: null,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      
      // For all other requests, use the original fetch
      return originalFetch.call(window, input, init)
    }
  })
}
