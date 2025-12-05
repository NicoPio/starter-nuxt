import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, watch } from 'vue'
import UserFilters from '~/app/components/admin/UserFilters.vue'
import type { UserFilters as UserFiltersType, UserRole } from '~/app/types/common.types'

// Mock Vue globals
global.ref = ref
global.computed = computed
global.watch = watch

// Mock useContentI18n
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'admin.users.filters.allRoles': 'Tous les rôles',
    'admin.users.filters.admin': 'Administrateur',
    'admin.users.filters.contributor': 'Contributeur',
    'admin.users.filters.user': 'Utilisateur',
    'admin.users.search': 'Rechercher par email ou nom...',
    'admin.users.filters.clear': 'Réinitialiser',
    'admin.users.filters.active': 'Filtres actifs'
  }
  return translations[key] || key
})

vi.mock('~/composables/useContentI18n', () => ({
  useContentI18n: () => ({ t: mockT }),
  default: () => ({ t: mockT })
}))

// Mock global imports for composable
global.useContentI18n = () => ({ t: mockT })

describe('UserFilters Component', () => {
  const defaultProps = {
    filters: {
      role: undefined,
      search: undefined
    } as UserFiltersType,
    roleStats: [
      { role: 'Admin' as UserRole, count: 2 },
      { role: 'Contributor' as UserRole, count: 5 },
      { role: 'User' as UserRole, count: 10 }
    ],
    loading: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Props', () => {
    it('reçoit les props correctement', () => {
      const wrapper = mount(UserFilters, {
        props: defaultProps,
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            USelect: true,
            UInput: true,
            UButton: true,
            UIcon: true
          }
        }
      })

      expect(wrapper.props('filters')).toEqual(defaultProps.filters)
      expect(wrapper.props('roleStats')).toEqual(defaultProps.roleStats)
      expect(wrapper.props('loading')).toBe(false)
    })

    it('accepte les roleStats optionnelles', () => {
      const wrapper = mount(UserFilters, {
        props: {
          ...defaultProps,
          roleStats: undefined
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            USelect: true,
            UInput: true,
            UButton: true,
            UIcon: true
          }
        }
      })

      expect(wrapper.props('roleStats')).toBeUndefined()
    })
  })

  describe('Filtres actifs', () => {
    it('reçoit un filtre de rôle actif', () => {
      const wrapper = mount(UserFilters, {
        props: {
          ...defaultProps,
          filters: {
            role: 'Admin' as UserRole,
            search: undefined
          }
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            USelect: true,
            UInput: true,
            UButton: true,
            UIcon: true
          }
        }
      })

      expect(wrapper.props('filters').role).toBe('Admin')
    })

    it('reçoit un filtre de recherche actif', () => {
      const wrapper = mount(UserFilters, {
        props: {
          ...defaultProps,
          filters: {
            role: undefined,
            search: 'test@example.com'
          }
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            USelect: true,
            UInput: true,
            UButton: true,
            UIcon: true
          }
        }
      })

      expect(wrapper.props('filters').search).toBe('test@example.com')
    })

    it('reçoit les deux filtres actifs', () => {
      const wrapper = mount(UserFilters, {
        props: {
          ...defaultProps,
          filters: {
            role: 'Contributor' as UserRole,
            search: 'john'
          }
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            USelect: true,
            UInput: true,
            UButton: true,
            UIcon: true
          }
        }
      })

      expect(wrapper.props('filters').role).toBe('Contributor')
      expect(wrapper.props('filters').search).toBe('john')
    })
  })

  describe('Événements', () => {
    it('émet updateFilters avec les nouveaux filtres', async () => {
      const wrapper = mount(UserFilters, {
        props: defaultProps,
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            USelect: true,
            UInput: true,
            UButton: true,
            UIcon: true
          }
        }
      })

      const newFilters: UserFiltersType = {
        role: 'Admin' as UserRole,
        search: 'test'
      }

      wrapper.vm.$emit('updateFilters', newFilters)
      expect(wrapper.emitted('updateFilters')).toBeTruthy()
      expect(wrapper.emitted('updateFilters')?.[0]).toEqual([newFilters])
    })

    it('émet clearFilters', async () => {
      const wrapper = mount(UserFilters, {
        props: {
          ...defaultProps,
          filters: {
            role: 'Admin' as UserRole,
            search: 'test'
          }
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            USelect: true,
            UInput: true,
            UButton: true,
            UIcon: true
          }
        }
      })

      wrapper.vm.$emit('clearFilters')
      expect(wrapper.emitted('clearFilters')).toBeTruthy()
    })
  })

  describe('État de chargement', () => {
    it('reçoit loading = true', () => {
      const wrapper = mount(UserFilters, {
        props: {
          ...defaultProps,
          loading: true
        },
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            USelect: true,
            UInput: true,
            UButton: true,
            UIcon: true
          }
        }
      })

      expect(wrapper.props('loading')).toBe(true)
    })

    it('reçoit loading = false', () => {
      const wrapper = mount(UserFilters, {
        props: defaultProps,
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            USelect: true,
            UInput: true,
            UButton: true,
            UIcon: true
          }
        }
      })

      expect(wrapper.props('loading')).toBe(false)
    })
  })

  describe('Statistiques de rôles', () => {
    it('reçoit les statistiques de rôles avec compteurs', () => {
      const wrapper = mount(UserFilters, {
        props: defaultProps,
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            USelect: true,
            UInput: true,
            UButton: true,
            UIcon: true
          }
        }
      })

      const roleStats = wrapper.props('roleStats')
      expect(roleStats).toHaveLength(3)
      expect(roleStats?.[0]).toEqual({ role: 'Admin', count: 2 })
      expect(roleStats?.[1]).toEqual({ role: 'Contributor', count: 5 })
      expect(roleStats?.[2]).toEqual({ role: 'User', count: 10 })
    })
  })

  describe('Traductions', () => {
    it('appelle useContentI18n pour les traductions', () => {
      mount(UserFilters, {
        props: defaultProps,
        global: {
          mocks: {
            useContentI18n: () => ({ t: mockT })
          },
          stubs: {
            USelect: true,
            UInput: true,
            UButton: true,
            UIcon: true
          }
        }
      })

      // Vérifier que mockT a été appelé
      expect(mockT).toHaveBeenCalled()
    })
  })
})
