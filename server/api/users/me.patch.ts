import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { UpdateProfileSchema } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const user = await serverSupabaseUser(event)

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    // Parse and validate request body
    const body = await readBody(event)
    const validatedData = UpdateProfileSchema.parse(body)

    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // Update user profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('id, email, role, full_name, avatar_url, created_at, updated_at')
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Update Failed',
        message: updateError.message || 'Failed to update profile'
      })
    }

    return profile
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
    console.error('Update profile error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'An unexpected error occurred while updating profile'
    })
  }
})
