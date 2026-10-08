import { createClient } from '@supabase/supabase-js'

for (const file of ['.env', '.env.local']) {
  try { process.loadEnvFile(file) } catch (error) { if (error.code !== 'ENOENT') throw error }
}
const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
if (!url || !process.env.SUPABASE_SECRET_KEY) throw new Error('Private server ENV is incomplete.')
const client = createClient(url, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
})
// Read-only access check. No business data is written or printed.
const connection = await client.from('business_settings').select('id').limit(1)
console.log(JSON.stringify({ connected: !connection.error, status: connection.status, errorCode: connection.error?.code || null }))
const setup = await client.rpc('check_shop_sync')
console.log(JSON.stringify({ syncSetupReady: !setup.error, status: setup.status, errorCode: setup.error?.code || null }))
if (setup.error) console.log('If setup is missing, run supabase/setup-local-sync.sql in Supabase SQL Editor.')
process.exitCode = connection.error || setup.error ? 1 : 0
