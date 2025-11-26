import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    // Get Supabase client
    const supabase = await serverSupabaseClient(event)

    // Sign out user
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Logout Failed',
        message: error.message
      })
    }

    // Return 204 No Content on success
    setResponseStatus(event, 204)
    return null
  } catch (error: any) {
    // Re-throw if it's already an HTTP error
    if (error.statusCode) {
      throw error
    }

    // Unknown error
    console.error('Logout error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'An unexpected error occurred during logout'
    })
  }
})
