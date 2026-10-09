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
    const routes = { '/api/cloud/check': 'check_shop_sync', '/api/cloud/sync': 'sync_shop_records', '/api/cloud/export': 'export_shop_records' }
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
      const { data, error } = await client.rpc(routes[req.url], req.url === '/api/cloud/sync' ? { changes: body.changes } : {})
      if (error) {
        const missing = error.code === 'PGRST202' || error.code === '42883'
        return send(502, { error: missing ? 'Supabase sync setup is not applied yet. Run supabase/setup-local-sync.sql once in the Supabase SQL Editor. Records remain saved locally.' : 'Cloud upload was not completed. Records remain saved locally. ' + error.message })
      }
      return send(200, req.url === '/api/cloud/export' ? data : { ok: true })
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
