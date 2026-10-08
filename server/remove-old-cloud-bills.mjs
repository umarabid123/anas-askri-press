import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

// One-time cleanup explicitly requested by the shop owner. No broad date deletes.
const invoiceNumbers = ['ARKI-6772', 'ARKI-9588', 'ARKI-8519', 'ARKI-8226', 'ARKI-4386', 'ARKI-2036', 'ARKI-1261', 'ARKI-6003', 'ARKI-8058']
for (const filename of ['.env', '.env.local']) {
  try { process.loadEnvFile(filename) } catch (error) { if (error.code !== 'ENOENT') throw error }
}
const cloud = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(25000) }) },
})
const { data: backup, error } = await cloud.rpc('export_shop_records')
if (error) throw new Error(error.message)
const targets = backup.tables.sales.filter(row => invoiceNumbers.includes(row.invoice_number))
assert.equal(targets.length, 9, 'Expected exactly the nine previously identified bills; stopping without changes')
const ids = targets.map(row => row.id)
for (const row of targets) {
  assert.equal(String(row.created_at).slice(0, 10), '2026-10-05', 'Unexpected bill date')
  assert.equal(backup.tables.sale_items.some(item => item.sale_id === row.id), false, 'Bill now has items; stopping')
  assert.equal(backup.tables.payments.some(payment => payment.sale_id === row.id), false, 'Bill now has a payment; stopping')
  assert.equal(backup.tables.customer_ledger.some(entry => entry.sale_id === row.id), false, 'Bill now has ledger history; stopping')
  if (row.customer_id) {
    const customer = backup.tables.customers.find(customer => customer.id === row.customer_id)
    assert.ok(customer, 'Linked customer is missing')
    assert.ok(['total_purchase', 'total_paid', 'balance'].every(field => Number(customer[field]) === 0), 'Customer has an account balance; reconciliation needs review')
    assert.equal(backup.tables.sales.some(sale => sale.customer_id === row.customer_id && !ids.includes(sale.id)), false, 'Customer has other bills; stopping')
    assert.equal(backup.tables.payments.some(payment => payment.customer_id === row.customer_id), false, 'Customer has receipts; stopping')
    assert.equal(backup.tables.customer_ledger.some(entry => entry.customer_id === row.customer_id), false, 'Customer has ledger history; stopping')
  }
}
const directory = 'artifacts/backups'
await fs.mkdir(directory, { recursive: true })
const backupPath = `${directory}/before-old-nine-bills-${Date.now()}.json`
await fs.writeFile(backupPath, JSON.stringify(backup, null, 2) + '\n', { flag: 'wx' })
const { data: deleted, error: deleteError } = await cloud.from('sales').delete().in('id', ids).in('invoice_number', invoiceNumbers).select('id')
if (deleteError) throw new Error(deleteError.message)
assert.equal(deleted.length, 9, 'Unexpected deletion count; inspect the saved backup')
const { data: remaining, error: verifyError } = await cloud.rpc('export_shop_records')
if (verifyError) throw new Error(verifyError.message)
assert.equal(remaining.tables.sales.some(row => ids.includes(row.id)), false)
assert.deepEqual(remaining.tables.sales, backup.tables.sales.filter(row => !ids.includes(row.id)), 'Other bills changed during cleanup')
for (const table of Object.keys(backup.tables).filter(table => table !== 'sales')) {
  assert.deepEqual(remaining.tables[table], backup.tables[table], `Unexpected change in ${table}`)
}
console.log(JSON.stringify({ removed: deleted.length, otherRecordsUnchanged: true, backupPath }))
