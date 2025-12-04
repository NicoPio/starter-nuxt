import { computed } from 'vue'
import { authClient } from '~/lib/auth-client'
import type { UserRole } from '~/types/common.types'

interface UserWithRole {
  id: string
  email: string
  name?: string | null
  role?: UserRole
}

export const useRole = () => {
  const session = authClient.useSession()

  const user = computed(() => session.value.data?.user as UserWithRole | undefined)
  const role = computed(() => user.value?.role || 'User' as UserRole)

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
