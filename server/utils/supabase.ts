// T009: Server-side Supabase client utility
import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

export const serverSupabaseClient = (event: H3Event) => {
  const config = useRuntimeConfig(event)

  return createClient(
    config.public.supabase.url,
    config.supabase.serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export const serverSupabaseUser = async (event: H3Event) => {
  const client = useSupabaseClient(event)
  const { data: { user }, error } = await client.auth.getUser()

  if (error || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  return user
}

export const serverSupabaseServiceRole = (event: H3Event) => {
  const config = useRuntimeConfig(event)

  return createClient(
    config.public.supabase.url,
    config.supabase.serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
