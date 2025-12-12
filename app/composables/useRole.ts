import { computed } from 'vue'
import type { UserRole } from '~/types/common.types'

export const useRole = () => {
  const { user: sessionUser } = useUserSession()

  const user = computed(() => sessionUser.value)
  const role = computed(() => (user.value?.role as UserRole) || 'User' as UserRole)

  const isAdmin = computed(() => role.value === 'Admin')
  const isContributor = computed(() => role.value === 'Contributor')
  const isUser = computed(() => role.value === 'User')

  const hasPermission = (requiredRole: UserRole | UserRole[]) => {
    const roleHierarchy: Record<UserRole, number> = {
      'User': 1,
      'Contributor': 2,
      'Admin': 3,
    }

    const currentRoleLevel = roleHierarchy[role.value] || 0
    const requiredRoles = Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole]

    return requiredRoles.some(r => currentRoleLevel >= (roleHierarchy[r] || 0))
  }

  const canManageUsers = computed(() => hasPermission('Admin'))
  const canViewUsers = computed(() => hasPermission(['Admin', 'Contributor']))
  const canCreateContent = computed(() => hasPermission(['Admin', 'Contributor']))

  return {
    user,
    role,
    isAdmin,
    isContributor,
    isUser,
    hasPermission,
    canManageUsers,
    canViewUsers,
    canCreateContent,
  }
}
