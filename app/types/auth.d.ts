/**
 * Type augmentation for nuxt-auth-utils
 * Extends the User type to include custom properties
 */

import type { UserRole } from '~/app/types/common.types'

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    role: UserRole
    name?: string
  }

  interface UserSession {
    user: User
    loggedInAt: number
  }
}

export {}
