/**
 * Index des utilitaires de test
 * Exporte tous les helpers de test pour faciliter les imports
 */

// Factory functions
export {
  createMockUser,
  createMockAdmin,
  createMockContributor,
  createMockSession,
  createMockSubscription,
  createMockSubscribedUser,
  createMockUserList,
  createMockSignupData,
  createMockLoginData,
} from './factories'

// Auth helpers
export {
  mockAuthState,
  mockUseAuth,
  mockUseRole,
  createAuthHeader,
  setupAuthenticatedUser,
  setupUnauthenticatedUser,
  setupAuthenticatedAdmin,
  setupAuthenticatedContributor,
  clearAuthMocks,
  mockAuthError,
  mockAuthLoading,
} from './auth-helpers'

// Test helpers
export {
  waitForNextTick,
  waitFor,
  mockApiSuccess,
  mockApiError,
  mockFetch,
  mockFetchError,
  createMockH3Event,
  waitForMount,
  delay,
  createMockRouter,
  mockUseRouter,
  createPaginationParams,
  clearAllMocks,
  suppressConsoleError,
  waitForElement,
  typeInInput,
  clickButton,
} from './test-helpers'
