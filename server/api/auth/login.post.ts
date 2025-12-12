/**
 * Login endpoint for nuxt-auth-utils
 * Supports both bcrypt (legacy Better Auth) and scrypt passwords
 */

import { z } from 'zod'
import { verifyPasswordCustom, rehashIfNeeded } from '../../utils/password'
import { getUserByEmail } from '../../utils/database/users'

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export default defineEventHandler(async (event) => {
  try {
    // Parse and validate request body
    const body = await readBody(event)
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        message: validation.error.errors[0].message,
      })
    }

    const { email, password } = validation.data

    // Get user from database
    const user = await getUserByEmail(email)

    if (!user || !user.hashed_password) {
      throw createError({
        statusCode: 401,
        message: 'Invalid email or password',
      })
    }

    // Verify password (supports both bcrypt and scrypt)
    const isValid = await verifyPasswordCustom(password, user.hashed_password)

    if (!isValid) {
      throw createError({
        statusCode: 401,
        message: 'Invalid email or password',
      })
    }

    // Lazy password rehashing (bcrypt → scrypt migration)
    await rehashIfNeeded(user.id, password, user.hashed_password)

    // Create nuxt-auth-utils session
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
    console.error('Login error:', error)

    throw createError({
      statusCode: 500,
      message: 'An error occurred during login',
    })
  }
})
