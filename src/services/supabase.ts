import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export function isSupabaseConfigured(): boolean {
  return !!rawUrl && !rawUrl.includes('your-') && !!anonKey && !anonKey.includes('your-')
}

let clientInstance: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!clientInstance) {
    clientInstance = createClient(rawUrl!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
          }),
      },
    })
  }
  return clientInstance
}

export async function checkSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const client = getClient()
  if (client) {
    try {
      const { error } = await client.rpc('check_shop_sync')
      if (!error) return true
      const test = await client.from('business_settings').select('id').limit(1)
      if (!test.error) return true
    } catch {
      // try fallback below
    }
  }

  try {
    const native = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
    const base = native ? 'http://127.0.0.1:5175' : ''
    const res = await fetch(base + '/api/cloud/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function syncCloudChanges(changes: unknown[]): Promise<void> {
  const client = getClient()
  if (client) {
    try {
      const { error } = await client.rpc('sync_shop_records', { changes })
      if (!error) return
      console.warn('Direct cloud sync fallback:', error.message)
    } catch (err) {
      console.warn('Direct cloud sync failed, checking companion:', err)
    }
  }

  // Fallback to local companion server if running
  const native = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  const base = native ? 'http://127.0.0.1:5175' : ''
  const response = await fetch(base + '/api/cloud/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes }),
    signal: AbortSignal.timeout(25000),
  }).catch(() => null)

  const result = await response?.json().catch(() => null)
  if (response?.ok) return

  throw new Error(result?.error || 'Cloud connection is unavailable. Records remain saved locally.')
}

export async function exportCloudRecords(): Promise<unknown> {
  const client = getClient()
  if (client) {
    try {
      const { data, error } = await client.rpc('export_shop_records')
      if (!error && data) return data
    } catch {
      // fallback to companion
    }
  }

  const native = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  const base = native ? 'http://127.0.0.1:5175' : ''
  const response = await fetch(base + '/api/cloud/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(25000),
  }).catch(() => null)

  if (response?.ok) return await response.json()
  throw new Error('Cloud connection is unavailable.')
}
