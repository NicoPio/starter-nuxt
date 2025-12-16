import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserWithRole, UserRole, UserListResponse } from '~/types/common.types'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock useContentI18n - must be defined before import
const mockT = vi.fn((key: string) => key)
vi.stubGlobal('useContentI18n', () => ({
  t: mockT,
  locale: { value: 'fr' },
  setLocale: vi.fn(),
  loadTranslations: vi.fn(),
}))

describe('useUsers', () => {
  let useUsers: any

  beforeEach(async () => {
    vi.resetModules()
    mockFetch.mockReset()

    const module = await import('~/app/composables/useUsers')
    useUsers = module.useUsers
  })

  const createMockUser = (id: string, role: UserRole = 'User'): UserWithRole => ({
    id,
    email: `user${id}@example.com`,
    name: `User ${id}`,
    role,
    createdAt: new Date('2024-01-01'),
    emailVerified: true,
    image: null,
    updatedAt: new Date('2024-01-01'),
  })

  const createMockResponse = (users: UserWithRole[], page = 1, total = 100): UserListResponse => ({
    users,
    pagination: {
      page,
      limit: 20,
      total,
      totalPages: Math.ceil(total / 20),
    },
    filters: {
      role: undefined,
      search: undefined,
    },
  })

  describe('initial state', () => {
    it('initializes with empty users array', () => {
      const { users } = useUsers()

      expect(users.value).toEqual([])
    })

    it('initializes with loading false', () => {
      const { loading } = useUsers()

      expect(loading.value).toBe(false)
    })

    it('initializes with null error', () => {
      const { error } = useUsers()

      expect(error.value).toBeNull()
    })

    it('initializes pagination with default values', () => {
      const { pagination } = useUsers()

      expect(pagination.value).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      })
    })

    it('initializes filters with undefined values', () => {
      const { filters } = useUsers()

      expect(filters.value).toEqual({
        role: undefined,
        search: undefined,
      })
    })
  })

  describe('hasUsers computed', () => {
    it('returns false when users array is empty', () => {
      const { hasUsers } = useUsers()

      expect(hasUsers.value).toBe(false)
    })

    it('returns true when users array has items', async () => {
      const { fetchUsers, hasUsers } = useUsers()
      const mockUsers = [createMockUser('1'), createMockUser('2')]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUsers))

      await fetchUsers()

      expect(hasUsers.value).toBe(true)
    })
  })

  describe('hasPreviousPage computed', () => {
    it('returns false when on page 1', () => {
      const { hasPreviousPage } = useUsers()

      expect(hasPreviousPage.value).toBe(false)
    })

    it('returns true when on page 2 or higher', async () => {
      const { fetchUsers, hasPreviousPage, pagination } = useUsers()
      const mockUsers = [createMockUser('1')]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUsers, 2, 100))

      await fetchUsers()

      expect(pagination.value.page).toBe(2)
      expect(hasPreviousPage.value).toBe(true)
    })
  })

  describe('hasNextPage computed', () => {
    it('returns true when current page is less than total pages', async () => {
      const { fetchUsers, hasNextPage } = useUsers()
      const mockUsers = [createMockUser('1')]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUsers, 1, 100))

      await fetchUsers()

      expect(hasNextPage.value).toBe(true)
    })

    it('returns false when on last page', async () => {
      const { fetchUsers, hasNextPage } = useUsers()
      const mockUsers = [createMockUser('1')]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUsers, 5, 100))

      await fetchUsers()

      expect(hasNextPage.value).toBe(false)
    })
  })

  describe('fetchUsers', () => {
    it('fetches users successfully', async () => {
      const { fetchUsers, users, pagination } = useUsers()
      const mockUsers = [createMockUser('1'), createMockUser('2')]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUsers))

      await fetchUsers()

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users', {
        query: { page: 1, limit: 20 },
      })
      expect(users.value).toEqual(mockUsers)
      expect(pagination.value.total).toBe(100)
    })

    it('sets loading to true during fetch', async () => {
      const { fetchUsers, loading } = useUsers()
      mockFetch.mockImplementationOnce(() => new Promise(resolve =>
        setTimeout(() => resolve(createMockResponse([])), 100)
      ))

      const promise = fetchUsers()
      expect(loading.value).toBe(true)

      await promise
      expect(loading.value).toBe(false)
    })

    it('includes role filter in query when set', async () => {
      const { fetchUsers, filters } = useUsers()
      filters.value.role = 'Admin'
      mockFetch.mockResolvedValueOnce(createMockResponse([]))

      await fetchUsers()

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users', {
        query: { page: 1, limit: 20, role: 'Admin' },
      })
    })

    it('includes search filter in query when set', async () => {
      const { fetchUsers, filters } = useUsers()
      filters.value.search = 'test@example.com'
      mockFetch.mockResolvedValueOnce(createMockResponse([]))

      await fetchUsers()

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users', {
        query: { page: 1, limit: 20, search: 'test@example.com' },
      })
    })

    it('sets error message when fetch fails', async () => {
      const { fetchUsers, error } = useUsers()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await fetchUsers()

      expect(error.value).toBe('admin.users.messages.loadError')
    })

    it('clears error before new fetch', async () => {
      const { fetchUsers, error } = useUsers()

      // First fetch fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      await fetchUsers()
      expect(error.value).toBe('admin.users.messages.loadError')

      // Second fetch succeeds
      mockFetch.mockResolvedValueOnce(createMockResponse([]))
      await fetchUsers()
      expect(error.value).toBeNull()
    })
  })

  describe('goToPage', () => {
    it('changes page and fetches users', async () => {
      const { goToPage, pagination } = useUsers()
      mockFetch.mockResolvedValueOnce(createMockResponse([], 3))

      await goToPage(3)

      expect(pagination.value.page).toBe(3)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users', {
        query: { page: 3, limit: 20 },
      })
    })
  })

  describe('nextPage', () => {
    it('goes to next page when available', async () => {
      const { fetchUsers, nextPage, pagination } = useUsers()
      mockFetch.mockResolvedValueOnce(createMockResponse([], 1, 100))
      await fetchUsers()

      mockFetch.mockResolvedValueOnce(createMockResponse([], 2, 100))
      await nextPage()

      expect(pagination.value.page).toBe(2)
    })

    it('does not change page when on last page', async () => {
      const { fetchUsers, nextPage, pagination } = useUsers()
      mockFetch.mockResolvedValueOnce(createMockResponse([], 5, 100))
      await fetchUsers()

      const initialCalls = mockFetch.mock.calls.length
      await nextPage()

      expect(pagination.value.page).toBe(5)
      expect(mockFetch.mock.calls.length).toBe(initialCalls)
    })
  })

  describe('previousPage', () => {
    it('goes to previous page when available', async () => {
      const { fetchUsers, previousPage, pagination } = useUsers()
      mockFetch.mockResolvedValueOnce(createMockResponse([], 2, 100))
      await fetchUsers()

      mockFetch.mockResolvedValueOnce(createMockResponse([], 1, 100))
      await previousPage()

      expect(pagination.value.page).toBe(1)
    })

    it('does not change page when on first page', async () => {
      const { previousPage, pagination } = useUsers()

      const initialCalls = mockFetch.mock.calls.length
      await previousPage()

      expect(pagination.value.page).toBe(1)
      expect(mockFetch.mock.calls.length).toBe(initialCalls)
    })
  })

  describe('setRoleFilter', () => {
    it('sets role filter and resets to page 1', async () => {
      const { setRoleFilter, filters, pagination } = useUsers()
      pagination.value.page = 3
      const response = createMockResponse([])
      response.filters.role = 'Admin'
      mockFetch.mockResolvedValueOnce(response)

      await setRoleFilter('Admin')

      expect(filters.value.role).toBe('Admin')
      expect(pagination.value.page).toBe(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users', {
        query: { page: 1, limit: 20, role: 'Admin' },
      })
    })

    it('allows setting filter to undefined', async () => {
      const { setRoleFilter, filters } = useUsers()
      filters.value.role = 'Admin'
      mockFetch.mockResolvedValueOnce(createMockResponse([]))

      await setRoleFilter(undefined)

      expect(filters.value.role).toBeUndefined()
    })
  })

  describe('setSearchFilter', () => {
    it('sets search filter and resets to page 1', async () => {
      const { setSearchFilter, filters, pagination } = useUsers()
      pagination.value.page = 3
      const response = createMockResponse([])
      response.filters.search = 'test@example.com'
      mockFetch.mockResolvedValueOnce(response)

      await setSearchFilter('test@example.com')

      expect(filters.value.search).toBe('test@example.com')
      expect(pagination.value.page).toBe(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users', {
        query: { page: 1, limit: 20, search: 'test@example.com' },
      })
    })

    it('allows setting search to undefined', async () => {
      const { setSearchFilter, filters } = useUsers()
      filters.value.search = 'test'
      mockFetch.mockResolvedValueOnce(createMockResponse([]))

      await setSearchFilter(undefined)

      expect(filters.value.search).toBeUndefined()
    })
  })

  describe('clearFilters', () => {
    it('clears all filters and resets to page 1', async () => {
      const { clearFilters, filters, pagination } = useUsers()
      filters.value.role = 'Admin'
      filters.value.search = 'test'
      pagination.value.page = 3
      mockFetch.mockResolvedValueOnce(createMockResponse([]))

      await clearFilters()

      expect(filters.value.role).toBeUndefined()
      expect(filters.value.search).toBeUndefined()
      expect(pagination.value.page).toBe(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users', {
        query: { page: 1, limit: 20 },
      })
    })
  })

  describe('refresh', () => {
    it('refetches users without changing page', async () => {
      const { fetchUsers, refresh, pagination } = useUsers()
      mockFetch.mockResolvedValueOnce(createMockResponse([], 3, 100))
      await fetchUsers()
      pagination.value.page = 3

      mockFetch.mockResolvedValueOnce(createMockResponse([], 3, 100))
      await refresh()

      expect(pagination.value.page).toBe(3)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('updateUserRole', () => {
    it('updates user role with optimistic update', async () => {
      const { fetchUsers, updateUserRole, users } = useUsers()
      const mockUsers = [createMockUser('1', 'User'), createMockUser('2', 'User')]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUsers))
      await fetchUsers()

      mockFetch.mockResolvedValueOnce({})
      const result = await updateUserRole('1', 'Admin')

      expect(users.value[0]?.role).toBe('Admin')
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/1/role', {
        method: 'PATCH',
        body: { role: 'Admin' },
      })
      expect(result).toEqual({ success: true, error: null })
    })

    it('rolls back on error', async () => {
      const { fetchUsers, updateUserRole, users } = useUsers()
      const mockUsers = [createMockUser('1', 'User')]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUsers))
      await fetchUsers()

      const error = { message: 'Update failed' }
      mockFetch.mockRejectedValueOnce(error)
      const result = await updateUserRole('1', 'Admin')

      expect(users.value[0]?.role).toBe('User')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })
  })

  describe('deleteUser', () => {
    it('deletes user with optimistic update', async () => {
      const { fetchUsers, deleteUser, users, pagination } = useUsers()
      const mockUsers = [createMockUser('1'), createMockUser('2')]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUsers, 1, 2))
      await fetchUsers()

      mockFetch.mockResolvedValueOnce({})
      const result = await deleteUser('1')

      expect(users.value).toHaveLength(1)
      expect(users.value[0]?.id).toBe('2')
      expect(pagination.value.total).toBe(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/1', {
        method: 'DELETE',
      })
      expect(result).toEqual({ success: true, error: null })
    })

    it('rolls back on error', async () => {
      const { fetchUsers, deleteUser, users } = useUsers()
      const mockUsers = [createMockUser('1'), createMockUser('2')]
      mockFetch.mockResolvedValueOnce(createMockResponse(mockUsers))
      await fetchUsers()

      const error = { message: 'Delete failed' }
      mockFetch.mockRejectedValueOnce(error)
      const result = await deleteUser('1')

      expect(users.value).toHaveLength(2)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Delete failed')
    })
  })
})
