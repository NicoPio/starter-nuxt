import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

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

    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, full_name, avatar_url, created_at, updated_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Profile Not Found',
        message: 'User profile not found'
      })
    }

    return profile
  } catch (error: any) {
    // Re-throw if it's already an HTTP error
    if (error.statusCode) {
      throw error
    }

    // Unknown error
    console.error('Get profile error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'An unexpected error occurred while fetching profile'
    })
  }
})
