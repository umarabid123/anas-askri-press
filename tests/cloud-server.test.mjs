import test from 'node:test'
import assert from 'node:assert/strict'
import { createCloudServer } from '../server/cloud.mjs'

async function companion(t, client, options) {
  const server = createCloudServer(client, options)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  return (route, body = {}, extra = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/cloud/${route}`, {
    method: 'POST', headers: { Origin: 'http://127.0.0.1:5173', 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body),
  })
}
test('local companion forwards sync without any user session and returns cloud acknowledgment', async t => {
  let upload
  const request = await companion(t, { rpc: async (name, args) => { upload = { name, args }; return { data: null, error: null } } })
  const changes = [{ table: 'customers', operation: 'UPSERT', row: { id: 'test', name: 'Test' } }]
  const response = await request('sync', { changes })
  assert.equal(response.status, 200)
  assert.deepEqual(upload, { name: 'sync_shop_records', args: { changes } })
  assert.deepEqual(await response.json(), { ok: true })
})
test('local companion rejects other origins, missing origins and arbitrary operations before accessing cloud', async t => {
  let calls = 0
  const request = await companion(t, { rpc: async () => { calls++; return {} } })
  assert.equal((await request('sync', {}, { Origin: 'https://untrusted.example' })).status, 403)
  assert.equal((await request('sync', {}, { Origin: '' })).status, 403)
  assert.equal((await request('arbitrary-sql')).status, 404)
  assert.equal((await request('sync', { changes: 'bad' })).status, 400)
  assert.equal(calls, 0)
})
test('missing credentials, unavailable schema and cloud failures never return a successful acknowledgment', async t => {
  const unconfigured = await companion(t, null)
  assert.equal((await unconfigured('check')).status, 503)
  const missing = await companion(t, { rpc: async () => ({ error: { code: 'PGRST202' } }) })
  const response = await missing('sync', { changes: [] })
  assert.equal(response.status, 502)
  assert.match((await response.json()).error, /setup-local-sync.sql/)
  const offline = await companion(t, { rpc: async () => { throw new Error('Network down') } })
  assert.equal((await offline('sync', { changes: [] })).status, 502)
})
test('local companion limits body size and exports through the server-only RPC', async t => {
  let called
  const request = await companion(t, { rpc: async name => { called = name; return { data: { format: 'arki-pos' } } } }, { maxBodyBytes: 50 })
  assert.equal((await request('sync', { changes: ['x'.repeat(100)] })).status, 413)
  const response = await request('export')
  assert.equal(called, 'export_shop_records')
  assert.deepEqual(await response.json(), { format: 'arki-pos' })
})
