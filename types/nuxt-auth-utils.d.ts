/**
 * Extend nuxt-auth-utils User type with custom properties
 */

declare module 'nuxt-auth-utils' {
  interface User {
    id: string
    email: string
    name?: string
    role: 'User' | 'Contributor' | 'Admin'
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface UserSession {}
}

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name?: string
    role: 'User' | 'Contributor' | 'Admin'
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface UserSession {}
}

export {}
