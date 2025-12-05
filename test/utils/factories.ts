import type { UserWithRole } from '~/types/common.types'

/**
 * Factory functions pour créer des mock data pour les tests
 */

/**
 * Crée un utilisateur de test avec les propriétés optionnelles
 */
export function createMockUser(overrides: Partial<UserWithRole> = {}): UserWithRole {
  return {
    id: overrides.id ?? 'test-user-id',
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? 'test@example.com',
    emailVerified: overrides.emailVerified ?? false,
    image: overrides.image ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    role: overrides.role ?? 'user',
    stripeCustomerId: overrides.stripeCustomerId ?? null,
    stripeSubscriptionId: overrides.stripeSubscriptionId ?? null,
    subscriptionStatus: overrides.subscriptionStatus ?? null,
    subscriptionPlan: overrides.subscriptionPlan ?? null,
    subscriptionCurrentPeriodEnd: overrides.subscriptionCurrentPeriodEnd ?? null,
  }
}

/**
 * Crée un utilisateur Admin
 */
export function createMockAdmin(overrides: Partial<UserWithRole> = {}): UserWithRole {
  return createMockUser({
    id: 'admin-user-id',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    ...overrides,
  })
}

/**
 * Crée un utilisateur Contributor
 */
export function createMockContributor(overrides: Partial<UserWithRole> = {}): UserWithRole {
  return createMockUser({
    id: 'contributor-user-id',
    name: 'Contributor User',
    email: 'contributor@example.com',
    role: 'contributor',
    ...overrides,
  })
}

/**
 * Crée une session de test
 */
export function createMockSession(userId: string = 'test-user-id') {
  return {
    id: 'test-session-id',
    userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    token: 'test-session-token',
    ipAddress: '127.0.0.1',
    userAgent: 'Test User Agent',
  }
}

/**
 * Crée des données de subscription Stripe
 */
export function createMockSubscription(overrides: {
  status?: 'active' | 'canceled' | 'past_due' | 'trialing' | null
  plan?: 'starter' | 'pro' | 'enterprise' | null
  customerId?: string | null
  subscriptionId?: string | null
  currentPeriodEnd?: Date | null
} = {}) {
  return {
    stripeCustomerId: overrides.customerId ?? 'cus_test123',
    stripeSubscriptionId: overrides.subscriptionId ?? 'sub_test123',
    subscriptionStatus: overrides.status ?? 'active',
    subscriptionPlan: overrides.plan ?? 'pro',
    subscriptionCurrentPeriodEnd: overrides.currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
  }
}

/**
 * Crée un utilisateur avec subscription
 */
export function createMockSubscribedUser(
  userOverrides: Partial<UserWithRole> = {},
  subscriptionOverrides: Parameters<typeof createMockSubscription>[0] = {}
): UserWithRole {
  return createMockUser({
    ...userOverrides,
    ...createMockSubscription(subscriptionOverrides),
  })
}

/**
 * Crée une liste d'utilisateurs de test
 */
export function createMockUserList(count: number = 5): UserWithRole[] {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      id: `user-${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: i === 0 ? 'admin' : i === 1 ? 'contributor' : 'user',
    })
  )
}

/**
 * Crée des données de formulaire d'inscription
 */
export function createMockSignupData(overrides: {
  name?: string
  email?: string
  password?: string
} = {}) {
  return {
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? 'test@example.com',
    password: overrides.password ?? 'SecurePassword123',
  }
}

/**
 * Crée des données de formulaire de connexion
 */
export function createMockLoginData(overrides: {
  email?: string
  password?: string
} = {}) {
  return {
    email: overrides.email ?? 'test@example.com',
    password: overrides.password ?? 'SecurePassword123',
  }
}
