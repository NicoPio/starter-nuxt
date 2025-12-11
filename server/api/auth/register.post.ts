/**
 * Register endpoint for nuxt-auth-utils
 * Creates new user with scrypt password hashing
 */

import { z } from 'zod'
import { hashPasswordCustom } from '../../utils/password'
import { createUser, getUserByEmail } from '../../utils/database/users'

// Validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
})

export default defineEventHandler(async (event) => {
  try {
    // Parse and validate request body
    const body = await readBody(event)
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        message: validation.error.errors[0].message,
      })
    }

    const { email, password, name } = validation.data

    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      throw createError({
        statusCode: 409,
        message: 'User with this email already exists',
      })
    }

    // Hash password with scrypt
    const hashedPassword = await hashPasswordCustom(password)

    // Create user
    const user = await createUser({
      email,
      name: name || email.split('@')[0],
      hashed_password: hashedPassword,
      role: 'User',
    })

    // Auto-login: Create nuxt-auth-utils session
    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name || undefined,
      },
      loggedInAt: Date.now(),
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }
  } catch (error: unknown) {
    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // Log unexpected errors
    console.error('Register error:', error)

    throw createError({
      statusCode: 500,
      message: 'An error occurred during registration',
    })
  }
})
