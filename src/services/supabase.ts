// Browser requests go through the local server; private cloud keys never enter Vite.
const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
export function isSupabaseConfigured(): boolean { return !!rawUrl?.trim() && !rawUrl.includes('your-') }
async function cloudRequest<T>(route: string, body: object = {}): Promise<T> {
  const native = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  const base = native ? 'http://127.0.0.1:5175' : ''
  const response = await fetch(base + '/api/cloud/' + route, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(25000),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error || 'Cloud connection is unavailable. Records remain saved locally.')
  return result as T
}
export async function syncCloudChanges(changes: unknown[]): Promise<void> { await cloudRequest('sync', { changes }) }
export function exportCloudRecords(): Promise<unknown> { return cloudRequest('export') }
export async function checkSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try { await cloudRequest('check'); return true } catch { return false }
}
