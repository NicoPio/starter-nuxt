import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

// Validation schema
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().optional()
})

export default defineEventHandler(async (event) => {
  try {
    // Parse and validate request body
    const body = await readBody(event)
    const validatedData = signupSchema.parse(body)

    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          full_name: validatedData.full_name
        }
      }
    })

    if (authError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Signup Failed',
        message: authError.message
      })
    }

    if (!authData.user) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Signup Failed',
        message: 'User creation failed'
      })
    }

    // The trigger will automatically create the profile and free subscription
    // Return user data and session
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: 'User' // Default role
      },
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
    console.error('Signup error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'An unexpected error occurred during signup'
    })
  }
})
