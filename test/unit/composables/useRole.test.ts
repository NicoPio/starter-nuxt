import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { UserRole } from '~/types/common.types'

// Mock nuxt-auth-utils
const mockUserSession = {
  user: ref(null),
}

// Set global mock before imports
global.useUserSession = vi.fn(() => mockUserSession)

describe('useRole', () => {
  beforeEach(() => {
    // Reset user to null before each test
    mockUserSession.user.value = null
  })

  const createMockUser = (role: UserRole = 'User') => ({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role,
  })

  const setupComposable = async (role: UserRole = 'User') => {
    const mockUser = createMockUser(role)
    mockUserSession.user.value = mockUser

    const { useRole } = await import('~/app/composables/useRole')
    return useRole()
  }

  describe('user and role computed properties', () => {
    it('returns user from session data', async () => {
      const { user } = await setupComposable('Admin')

      expect(user.value).toBeDefined()
      expect(user.value?.id).toBe('user-123')
      expect(user.value?.email).toBe('test@example.com')
      expect(user.value?.role).toBe('Admin')
    })

    it('returns null user when session has no data', async () => {
      mockUserSession.user.value = null

      const { useRole } = await import('~/app/composables/useRole')
      const { user } = useRole()

      expect(user.value).toBeNull()
    })

    it('returns default User role when user has no role', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUserSession.user.value = mockUser as any

      const { useRole } = await import('~/app/composables/useRole')
      const { role } = useRole()

      expect(role.value).toBe('User')
    })

    it('returns correct role from user', async () => {
      const { role } = await setupComposable('Contributor')

      expect(role.value).toBe('Contributor')
    })
  })

  describe('isAdmin computed', () => {
    it('returns true when user is Admin', async () => {
      const { isAdmin } = await setupComposable('Admin')

      expect(isAdmin.value).toBe(true)
    })

    it('returns false when user is Contributor', async () => {
      const { isAdmin } = await setupComposable('Contributor')

      expect(isAdmin.value).toBe(false)
    })

    it('returns false when user is User', async () => {
      const { isAdmin } = await setupComposable('User')

      expect(isAdmin.value).toBe(false)
    })
  })

  describe('isContributor computed', () => {
    it('returns true when user is Contributor', async () => {
      const { isContributor } = await setupComposable('Contributor')

      expect(isContributor.value).toBe(true)
    })

    it('returns false when user is Admin', async () => {
      const { isContributor } = await setupComposable('Admin')

      expect(isContributor.value).toBe(false)
    })

    it('returns false when user is User', async () => {
      const { isContributor } = await setupComposable('User')

      expect(isContributor.value).toBe(false)
    })
  })

  describe('isUser computed', () => {
    it('returns true when user is User', async () => {
      const { isUser } = await setupComposable('User')

      expect(isUser.value).toBe(true)
    })

    it('returns false when user is Admin', async () => {
      const { isUser } = await setupComposable('Admin')

      expect(isUser.value).toBe(false)
    })

    it('returns false when user is Contributor', async () => {
      const { isUser } = await setupComposable('Contributor')

      expect(isUser.value).toBe(false)
    })
  })

  describe('hasPermission function', () => {
    it('returns true when Admin checks for Admin permission', async () => {
      const { hasPermission } = await setupComposable('Admin')

      expect(hasPermission('Admin')).toBe(true)
    })

    it('returns true when Admin checks for Contributor permission (hierarchy)', async () => {
      const { hasPermission } = await setupComposable('Admin')

      expect(hasPermission('Contributor')).toBe(true)
    })

    it('returns true when Admin checks for User permission (hierarchy)', async () => {
      const { hasPermission } = await setupComposable('Admin')

      expect(hasPermission('User')).toBe(true)
    })

    it('returns true when Contributor checks for Contributor permission', async () => {
      const { hasPermission } = await setupComposable('Contributor')

      expect(hasPermission('Contributor')).toBe(true)
    })

    it('returns true when Contributor checks for User permission (hierarchy)', async () => {
      const { hasPermission } = await setupComposable('Contributor')

      expect(hasPermission('User')).toBe(true)
    })

    it('returns false when Contributor checks for Admin permission', async () => {
      const { hasPermission } = await setupComposable('Contributor')

      expect(hasPermission('Admin')).toBe(false)
    })

    it('returns true when User checks for User permission', async () => {
      const { hasPermission } = await setupComposable('User')

      expect(hasPermission('User')).toBe(true)
    })

    it('returns false when User checks for Contributor permission', async () => {
      const { hasPermission } = await setupComposable('User')

      expect(hasPermission('Contributor')).toBe(false)
    })

    it('returns false when User checks for Admin permission', async () => {
      const { hasPermission } = await setupComposable('User')

      expect(hasPermission('Admin')).toBe(false)
    })

    it('accepts array of roles and returns true if any matches', async () => {
      const { hasPermission } = await setupComposable('Contributor')

      expect(hasPermission(['Admin', 'Contributor'])).toBe(true)
    })

    it('accepts array of roles and returns false if none match', async () => {
      const { hasPermission } = await setupComposable('User')

      expect(hasPermission(['Admin', 'Contributor'])).toBe(false)
    })
  })

  describe('canManageUsers computed', () => {
    it('returns true for Admin', async () => {
      const { canManageUsers } = await setupComposable('Admin')

      expect(canManageUsers.value).toBe(true)
    })

    it('returns false for Contributor', async () => {
      const { canManageUsers } = await setupComposable('Contributor')

      expect(canManageUsers.value).toBe(false)
    })

    it('returns false for User', async () => {
      const { canManageUsers } = await setupComposable('User')

      expect(canManageUsers.value).toBe(false)
    })
  })

  describe('canViewUsers computed', () => {
    it('returns true for Admin', async () => {
      const { canViewUsers } = await setupComposable('Admin')

      expect(canViewUsers.value).toBe(true)
    })

    it('returns true for Contributor', async () => {
      const { canViewUsers } = await setupComposable('Contributor')

      expect(canViewUsers.value).toBe(true)
    })

    it('returns false for User', async () => {
      const { canViewUsers } = await setupComposable('User')

      expect(canViewUsers.value).toBe(false)
    })
  })

  describe('canCreateContent computed', () => {
    it('returns true for Admin', async () => {
      const { canCreateContent } = await setupComposable('Admin')

      expect(canCreateContent.value).toBe(true)
    })

    it('returns true for Contributor', async () => {
      const { canCreateContent } = await setupComposable('Contributor')

      expect(canCreateContent.value).toBe(true)
    })

    it('returns false for User', async () => {
      const { canCreateContent } = await setupComposable('User')

      expect(canCreateContent.value).toBe(false)
    })
  })
})
