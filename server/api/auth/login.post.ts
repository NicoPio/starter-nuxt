import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

// Validation schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  try {
    // Parse and validate request body
    const body = await readBody(event)
    const validatedData = loginSchema.parse(body)

    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // Authenticate user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password
    })

    if (authError) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication Failed',
        message: authError.message
      })
    }

    if (!authData.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication Failed',
        message: 'Invalid credentials'
      })
    }

    // Fetch user profile to get role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, full_name, avatar_url')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      // Return basic user info if profile fetch fails
      return {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role: 'User'
        },
        session: authData.session
      }
    }

    // Return user data with profile and session
    return {
      user: profile,
      session: authData.session
    }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation Error',
        message: 'Invalid input data',
        data: error.errors
      })
    }

    // Re-throw if it's already an HTTP error
    if (error.statusCode) {
      throw error
    }

    // Unknown error
    console.error('Login error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'An unexpected error occurred during login'
    })
  }
})
