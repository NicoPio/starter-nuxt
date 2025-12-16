/**
 * Type augmentation for nuxt-auth-utils
 * Extends the User type to include custom properties
 */

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    role: 'Admin' | 'Contributor' | 'User'
    name?: string
  }

  interface UserSession {
    user: User
    loggedInAt: number
  }
}

export {}
