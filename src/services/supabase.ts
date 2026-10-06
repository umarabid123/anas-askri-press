import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_URL = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '') : undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let supabaseInstance: SupabaseClient | null = null

/**
 * Checks if valid Supabase environment variables are provided
 */
export function isSupabaseConfigured(): boolean {
  return (
    typeof SUPABASE_URL === 'string' &&
    SUPABASE_URL.trim().length > 0 &&
    typeof SUPABASE_ANON_KEY === 'string' &&
    SUPABASE_ANON_KEY.trim().length > 0 &&
    !SUPABASE_URL.includes('your-') && !SUPABASE_ANON_KEY.includes('your-')
  )
}

/**
 * Gets or initializes the Supabase client singleton.
 * Returns null if Supabase is unconfigured (graceful offline-first operation).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err)
      return null
    }
  }

  return supabaseInstance
}

/**
 * Actively tests connectivity to the Supabase endpoint
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const { error } = await client.from('business_settings').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}
