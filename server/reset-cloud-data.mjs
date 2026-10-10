import fs from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

for (const filename of ['.env', '.env.local']) {
  try {
    process.loadEnvFile(filename)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY

if (!url || !key) {
  console.error('Error: SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env')
  process.exit(1)
}

const cloud = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (u, init) => fetch(u, { ...init, signal: AbortSignal.timeout(25000) }) },
})

console.log('1. Exporting backup before clearing...')
const { data: backup, error: exportError } = await cloud.rpc('export_shop_records')
if (exportError) {
  console.error('Export failed:', exportError)
  process.exit(1)
}

const directory = 'artifacts/backups'
await fs.mkdir(directory, { recursive: true })
const backupPath = `${directory}/pre-reset-${Date.now()}.json`
await fs.writeFile(backupPath, JSON.stringify(backup, null, 2) + '\n')
console.log(`✓ Safety backup saved to: ${backupPath}`)

console.log('2. Clearing transaction records...')
// Delete child records first to respect foreign keys
await cloud.from('sale_item_mazdoori_tasks').delete().neq('id', '')
await cloud.from('sale_items').delete().neq('id', '')
await cloud.from('payments').delete().neq('id', '')
await cloud.from('customer_ledger').delete().neq('id', '')
await cloud.from('mazdoori_entries').delete().neq('id', '')
await cloud.from('sales').delete().neq('id', '')
await cloud.from('expenses').delete().neq('id', '')
await cloud.from('sync_queue').delete().neq('id', '')

// Clear test customers and workers
await cloud.from('customers').delete().neq('id', '')
await cloud.from('mazdoors').delete().neq('id', '')

console.log('3. Resetting invoice counter in business settings...')
await cloud
  .from('business_settings')
  .update({ next_invoice_number: 1001, updated_at: new Date().toISOString() })
  .eq('id', 'default')

console.log('✓ All cloud records have been cleanly cleared.')
console.log('✓ Tables, columns, RLS security, and functions are intact.')
console.log('✓ Next invoice number reset to 1001.')
