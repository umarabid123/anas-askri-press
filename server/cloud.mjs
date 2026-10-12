import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const origins = new Set(['http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:5174', 'http://localhost:5174', 'http://127.0.0.1:4173', 'http://localhost:4173', 'tauri://localhost', 'http://tauri.localhost'])
export function createCloudServer(client, { maxBodyBytes = 50_000_000 } = {}) {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)) }
    // Only the locally running shop app may use this privileged companion.
    if (!origins.has(origin) || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) return send(403, { error: 'Local shop app access only.' })
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'POST')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      return send(204, null)
    }
    const routes = { '/api/cloud/check': 'check_shop_sync', '/api/cloud/sync': 'sync_shop_records', '/api/cloud/export': 'export_shop_records', '/api/cloud/pull': 'export_shop_records' }
    if (!routes[req.url] || req.method !== 'POST') return send(404, { error: 'Unknown cloud operation.' })
    if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'JSON request required.' })
    if (!client) return send(503, { error: 'Cloud setup needed: add SUPABASE_SECRET_KEY to the local server ENV. Records remain saved locally.' })
    try {
      const chunks = []; let bytes = 0
      for await (const chunk of req) {
        bytes += chunk.length
        if (bytes > maxBodyBytes) return send(413, { error: 'Cloud batch is too large. Records remain saved locally.' })
        chunks.push(chunk)
      }
      let body
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return send(400, { error: 'Invalid JSON request.' }) }
      if (req.url === '/api/cloud/sync' && (!Array.isArray(body?.changes) || body.changes.length > 100000)) return send(400, { error: 'Invalid sync batch.' })
      if (req.url === '/api/cloud/sync' && Array.isArray(body?.changes)) {
        const allowedCols = {
          business_settings: new Set(['id', 'business_name', 'subtitle', 'phone', 'address', 'logo_path', 'invoice_prefix', 'next_invoice_number', 'receipt_paper_size', 'footer_text', 'show_logo', 'default_printer', 'currency', 'currency_symbol', 'created_at', 'updated_at', 'sync_status']),
          customers: new Set(['id', 'name', 'mobile', 'address', 'total_purchase', 'total_paid', 'balance', 'created_at', 'updated_at', 'sync_status']),
          items: new Set(['id', 'name', 'urdu_name', 'category', 'default_rate', 'is_active', 'created_at', 'updated_at', 'sync_status']),
          sales: new Set(['id', 'invoice_number', 'customer_id', 'customer_name', 'customer_mobile', 'subtotal', 'discount', 'total_mazdoori', 'total', 'paid_amount', 'remaining_credit', 'payment_method', 'notes', 'created_at', 'updated_at', 'sync_status', 'cancelled_at', 'cancel_reason']),
          sale_items: new Set(['id', 'sale_id', 'item_id', 'item_name', 'quantity', 'rate', 'mazdoori', 'amount', 'created_at']),
          sale_item_mazdoori_tasks: new Set(['id', 'sale_item_id', 'title', 'amount', 'worker_name', 'created_at']),
          payments: new Set(['id', 'receipt_number', 'customer_id', 'sale_id', 'amount', 'payment_method', 'payment_date', 'notes', 'created_at', 'sync_status']),
          customer_ledger: new Set(['id', 'customer_id', 'sale_id', 'payment_id', 'date', 'description', 'debit', 'credit', 'balance', 'created_at']),
          mazdoors: new Set(['id', 'name', 'phone', 'total_work', 'total_paid', 'balance', 'created_at', 'updated_at', 'sync_status']),
          mazdoori_entries: new Set(['id', 'mazdoor_id', 'mazdoor_name', 'work_date', 'work_detail', 'amount', 'paid_amount', 'balance', 'notes', 'created_at', 'sync_status']),
          expenses: new Set(['id', 'category', 'amount', 'expense_date', 'payment_method', 'notes', 'created_at', 'updated_at', 'sync_status']),
        }
        for (const change of body.changes) {
          if (change?.row && allowedCols[change.table]) {
            const allowed = allowedCols[change.table]
            for (const key of Object.keys(change.row)) {
              if (!allowed.has(key)) delete change.row[key]
            }
          }
        }
        // If an older duplicate invoice already exists in the cloud under a different ID, clean it up first
        const salesUpserts = body.changes.filter(c => c.table === 'sales' && c.operation === 'UPSERT' && c.row?.invoice_number)
        for (const s of salesUpserts) {
          const { data: existing } = await client.from('sales').select('id').eq('invoice_number', s.row.invoice_number).neq('id', s.row.id)
          if (existing && existing.length > 0) {
            const staleIds = existing.map(e => e.id)
            const { data: staleItems } = await client.from('sale_items').select('id').in('sale_id', staleIds)
            if (staleItems && staleItems.length > 0) {
              await client.from('sale_item_mazdoori_tasks').delete().in('sale_item_id', staleItems.map(i => i.id))
            }
            await client.from('sale_items').delete().in('sale_id', staleIds)
            await client.from('payments').delete().in('sale_id', staleIds)
            await client.from('customer_ledger').delete().in('sale_id', staleIds)
            await client.from('sales').delete().in('id', staleIds)
          }
        }
      }
      const { data, error } = await client.rpc(routes[req.url], req.url === '/api/cloud/sync' ? { changes: body.changes } : {})
      if (error) {
        const missing = error.code === 'PGRST202' || error.code === '42883'
        return send(502, { error: missing ? 'Supabase sync setup is not applied yet. Run supabase/setup-local-sync.sql once in the Supabase SQL Editor. Records remain saved locally.' : 'Cloud upload was not completed. Records remain saved locally. ' + error.message })
      }
      return send(200, (req.url === '/api/cloud/export' || req.url === '/api/cloud/pull') ? data : { ok: true })
    } catch {
      return send(502, { error: 'Cloud connection failed or timed out. Records remain saved locally and will retry.' })
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const file of ['.env', '.env.local']) {
    try { process.loadEnvFile(file) } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
  const key = process.env.SUPABASE_SECRET_KEY
  const client = url && key ? createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) }) },
  }) : null
  const server = createCloudServer(client)
  server.listen(5175, '127.0.0.1', () => console.log('Local cloud companion: http://127.0.0.1:5175' + (client ? '' : ' (server ENV setup needed)')))
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)))
}
