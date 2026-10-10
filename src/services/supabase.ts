import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://snbugwjapuzsjinbjoog.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuYnVnd2phcHV6c2ppbmJqb29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNjk0NDUsImV4cCI6MjEwNjc0NTQ0NX0._2V5EnTSiQRJJfo-stBNedu725HbUE0-HKzv7ipJfjY'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_SUPABASE_URL
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || DEFAULT_SUPABASE_ANON_KEY

export function isSupabaseConfigured(): boolean {
  return !!rawUrl && !rawUrl.includes('your-') && !!anonKey && !anonKey.includes('your-')
}

let clientInstance: SupabaseClient | null = null

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  if (init?.signal) {
    init.signal.addEventListener('abort', () => controller.abort())
  }
  return fetch(input, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))
}

function getClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!clientInstance) {
    clientInstance = createClient(rawUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => fetchWithTimeout(input, init, 20000),
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
      const { data, error } = await client.rpc('check_shop_sync')
      if (!error && data !== false) return true
    } catch {
      // try direct fetch fallback below
    }
  }

  // Direct fetch fallback for environments where JS client has runtime issues
  try {
    const res = await fetchWithTimeout(`${rawUrl}/rest/v1/rpc/check_shop_sync`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
    }, 6000)
    if (res.ok) return true
  } catch {
    // continue to local companion
  }

  try {
    const native = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
    const base = native ? 'http://127.0.0.1:5175' : ''
    const res = await fetchWithTimeout(`${base}/api/cloud/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, 3000)
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
