// T014: Zod validation schemas
import { z } from 'zod'

// User role enum
export const UserRoleSchema = z.enum(['Admin', 'Contributor', 'User'])

// Profile schema
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  full_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

// Subscription status enum
export const SubscriptionStatusSchema = z.enum(['active', 'cancelled', 'expired', 'past_due'])

// Subscription schema
export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  stripe_customer_id: z.string(),
  stripe_subscription_id: z.string().nullable(),
  plan_type: z.string(),
  status: SubscriptionStatusSchema,
  current_period_start: z.string().datetime().nullable(),
  current_period_end: z.string().datetime().nullable(),
  cancel_at: z.string().datetime().nullable(),
  cancelled_at: z.string().datetime().nullable()
})

// Request validation schemas
export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1).max(255).optional()
})

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  avatar_url: z.string().url().optional()
})

export const UpdateRoleSchema = z.object({
  role: UserRoleSchema
})

export const CancelSubscriptionSchema = z.object({
  confirm: z.boolean().refine(val => val === true, {
    message: 'Confirmation is required'
  })
})

export const StripeConfigSchema = z.object({
  stripe_public_key: z.string().min(1),
  stripe_secret_key: z.string().min(1),
  webhook_secret: z.string().min(1),
  is_test_mode: z.boolean().default(true)
})

// Type exports
export type UserRole = z.infer<typeof UserRoleSchema>
export type Profile = z.infer<typeof ProfileSchema>
export type Subscription = z.infer<typeof SubscriptionSchema>
export type SignupInput = z.infer<typeof SignupSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>
export type StripeConfigInput = z.infer<typeof StripeConfigSchema>
