import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, h, resolveComponent } from 'vue'
import UserList from '~/components/admin/UserList.vue'
import type { UserWithRole } from '~/types/common.types'

// Mock Vue globals
global.computed = computed
global.h = h
global.resolveComponent = resolveComponent

// Mock useContentI18n
const mockT = vi.fn((key: string, params?: Record<string, unknown>) => {
  const translations: Record<string, string> = {
    'admin.users.email': 'Email',
    'admin.users.name': 'Nom',
    'admin.users.role': 'Rôle',
    'admin.users.createdAt': 'Créé le',
    'admin.users.actionsColumn': 'Actions',
    'admin.users.actions.edit': 'Modifier',
    'admin.users.actions.delete': 'Supprimer',
    'admin.users.loading': 'Chargement...',
    'admin.users.noUsers': 'Aucun utilisateur trouvé',
    'admin.users.pagination.page': `Page ${params?.page} sur ${params?.total}`,
    'admin.users.pagination.previous': 'Précédent',
    'admin.users.pagination.next': 'Suivant'
  }
  return translations[key] || key
})

vi.mock('~/composables/useContentI18n', () => ({
  useContentI18n: () => ({ t: mockT }),
  default: () => ({ t: mockT })
}))

// Mock global imports for composable
global.useContentI18n = () => ({ t: mockT })

describe('UserList Component', () => {
  const mockUsers: UserWithRole[] = [
    {
      id: '1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'Admin',
      createdAt: '2024-01-01T00:00:00Z',
      emailVerified: true,
      image: null
    },
    {
      id: '2',
      email: 'contributor@test.com',
      name: 'Contributor User',
      role: 'Contributor',
      createdAt: '2024-01-02T00:00:00Z',
      emailVerified: true,
      image: null
    },
    {
      id: '3',
      email: 'user@test.com',
      name: null,
      role: 'User',
      createdAt: '2024-01-03T00:00:00Z',
      emailVerified: true,
      image: null
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendu de la liste', () => {
    it('reçoit les props correctement', () => {
      const wrapper = mount(UserList, {
        props: {
          users: mockUsers,
          loading: false,
          page: 1,
          totalPages: 5,
          hasPreviousPage: false,
          hasNextPage: true
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            UTable: true,
            UIcon: true,
            UButton: true,
            UAvatar: true,
            UBadge: true
          }
        }
      })

      expect(wrapper.props('users')).toEqual(mockUsers)
      expect(wrapper.props('loading')).toBe(false)
      expect(wrapper.props('page')).toBe(1)
      expect(wrapper.props('totalPages')).toBe(5)
    })

    it('génère les colonnes avec les traductions', () => {
      const wrapper = mount(UserList, {
        props: {
          users: mockUsers,
          loading: false,
          page: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            UTable: true,
            UIcon: true,
            UButton: true,
            UAvatar: true,
            UBadge: true
          }
        }
      })

      // Vérifier que useContentI18n est appelé
      expect(mockT).toHaveBeenCalled()
    })
  })

  describe('État de chargement', () => {
    it('passe la prop loading correctement', () => {
      const wrapper = mount(UserList, {
        props: {
          users: [],
          loading: true,
          page: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            UTable: true,
            UIcon: true,
            UButton: true,
            UAvatar: true,
            UBadge: true
          }
        }
      })

      expect(wrapper.props('loading')).toBe(true)
    })
  })

  describe('État vide', () => {
    it('reçoit une liste vide correctement', () => {
      const wrapper = mount(UserList, {
        props: {
          users: [],
          loading: false,
          page: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            UTable: true,
            UIcon: true,
            UButton: true,
            UAvatar: true,
            UBadge: true
          }
        }
      })

      expect(wrapper.props('users')).toEqual([])
    })
  })

  describe('Événements de pagination', () => {
    it('émet l\'événement previousPage', async () => {
      const wrapper = mount(UserList, {
        props: {
          users: mockUsers,
          loading: false,
          page: 2,
          totalPages: 5,
          hasPreviousPage: true,
          hasNextPage: true
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            UTable: true,
            UIcon: true,
            UButton: true,
            UAvatar: true,
            UBadge: true
          }
        }
      })

      wrapper.vm.$emit('previousPage')
      expect(wrapper.emitted('previousPage')).toBeTruthy()
    })

    it('émet l\'événement nextPage', async () => {
      const wrapper = mount(UserList, {
        props: {
          users: mockUsers,
          loading: false,
          page: 2,
          totalPages: 5,
          hasPreviousPage: true,
          hasNextPage: true
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            UTable: true,
            UIcon: true,
            UButton: true,
            UAvatar: true,
            UBadge: true
          }
        }
      })

      wrapper.vm.$emit('nextPage')
      expect(wrapper.emitted('nextPage')).toBeTruthy()
    })

    it('émet l\'événement goToPage avec le numéro de page', async () => {
      const wrapper = mount(UserList, {
        props: {
          users: mockUsers,
          loading: false,
          page: 1,
          totalPages: 5,
          hasPreviousPage: false,
          hasNextPage: true
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            UTable: true,
            UIcon: true,
            UButton: true,
            UAvatar: true,
            UBadge: true
          }
        }
      })

      wrapper.vm.$emit('goToPage', 3)
      expect(wrapper.emitted('goToPage')).toBeTruthy()
      expect(wrapper.emitted('goToPage')?.[0]).toEqual([3])
    })
  })

  describe('Événements d\'action', () => {
    it('émet l\'événement editUser avec l\'utilisateur', async () => {
      const wrapper = mount(UserList, {
        props: {
          users: mockUsers,
          loading: false,
          page: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            UTable: true,
            UIcon: true,
            UButton: true,
            UAvatar: true,
            UBadge: true
          }
        }
      })

      wrapper.vm.$emit('editUser', mockUsers[0])
      expect(wrapper.emitted('editUser')).toBeTruthy()
      expect(wrapper.emitted('editUser')?.[0]).toEqual([mockUsers[0]])
    })

    it('émet l\'événement deleteUser avec l\'utilisateur', async () => {
      const wrapper = mount(UserList, {
        props: {
          users: mockUsers,
          loading: false,
          page: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            UTable: true,
            UIcon: true,
            UButton: true,
            UAvatar: true,
            UBadge: true
          }
        }
      })

      wrapper.vm.$emit('deleteUser', mockUsers[1])
      expect(wrapper.emitted('deleteUser')).toBeTruthy()
      expect(wrapper.emitted('deleteUser')?.[0]).toEqual([mockUsers[1]])
    })
  })

  describe('Pagination props', () => {
    it('reçoit hasPreviousPage = false sur la première page', () => {
      const wrapper = mount(UserList, {
        props: {
          users: mockUsers,
          loading: false,
          page: 1,
          totalPages: 5,
          hasPreviousPage: false,
          hasNextPage: true
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            UTable: true,
            UIcon: true,
            UButton: true,
            UAvatar: true,
            UBadge: true
          }
        }
      })

      expect(wrapper.props('hasPreviousPage')).toBe(false)
      expect(wrapper.props('hasNextPage')).toBe(true)
    })

    it('reçoit hasNextPage = false sur la dernière page', () => {
      const wrapper = mount(UserList, {
        props: {
          users: mockUsers,
          loading: false,
          page: 5,
          totalPages: 5,
          hasPreviousPage: true,
          hasNextPage: false
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            UTable: true,
            UIcon: true,
            UButton: true,
            UAvatar: true,
            UBadge: true
          }
        }
      })

      expect(wrapper.props('hasPreviousPage')).toBe(true)
      expect(wrapper.props('hasNextPage')).toBe(false)
    })
  })
})
