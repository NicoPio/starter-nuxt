// Rôles utilisateurs
export type UserRole = 'Admin' | 'Contributor' | 'User'

// Utilisateur avec rôle
export interface UserWithRole {
  id: string
  email: string
  name?: string | null
  role: UserRole
  createdAt: string
  emailVerified: boolean
  image?: string | null
  updatedAt?: string
}

// Statuts d'abonnement
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due'

// Types de plans
export type PlanType = 'free' | 'pro' | 'enterprise'

// Abonnement
export interface Subscription {
  id: string
  user_id: string
  plan_type: PlanType
  status: SubscriptionStatus
  stripe_subscription_id?: string | null
  stripe_customer_id?: string | null
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at?: string | null
  canceled_at?: string | null
  created_at: string
  updated_at: string
}

// Configuration Stripe
export interface StripeConfig {
  publishableKey: string
  secretKey?: string
  webhookSecret?: string
  priceIds?: {
    pro?: string
    enterprise?: string
  }
}

// Réponse paginée
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Réponse de liste d'utilisateurs
export interface UsersResponse {
  users: UserWithRole[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Mise à jour de rôle
export interface UpdateRoleRequest {
  role: UserRole
}

// Erreur API
export interface ApiError {
  statusCode: number
  message: string
  data?: unknown
}
