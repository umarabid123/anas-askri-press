import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { DatabaseSync } from 'node:sqlite'
const require = createRequire(import.meta.url)
const root = process.cwd()
const cache = new Map()
let signedIn = true, remoteError = null, receivedChanges = [], duringUpload = null
const remote = { auth: { getSession: async () => ({ data: { session: signedIn ? { user: {} } : null } }) }, rpc: async (_, { changes }) => { receivedChanges = changes; if (duringUpload) await duringUpload(); return { error: remoteError } } }
const mocks = { 'services/supabase.ts': { isSupabaseConfigured: () => true, getSupabaseClient: () => remote } }
function source(file) {
  file = path.resolve(file)
  if (cache.has(file)) return cache.get(file).exports
  const relative = path.relative(path.join(root, 'src'), file).replaceAll('\\', '/')
  if (mocks[relative]) return mocks[relative]
  const module = { exports: {} }; cache.set(file, module)
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const localRequire = spec => {
    if (spec.startsWith('@/') || spec.startsWith('.')) {
      let resolved = spec.startsWith('@/') ? path.join(root, 'src', spec.slice(2)) : path.resolve(path.dirname(file), spec)
      if (!resolved.endsWith('.ts')) resolved = fs.existsSync(resolved + '.ts') ? resolved + '.ts' : path.join(resolved, 'index.ts')
      return source(resolved)
    }
    return require(spec)
  }
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports)
  return module.exports
}
const memory = new Map()
globalThis.window = { addEventListener() {}, removeEventListener() {} }
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() }
const db = source(path.join(root, 'src/services/sqlite.service.ts'))
const { prepareBill } = source(path.join(root, 'src/utils/billing.ts'))
const { validateBackup } = source(path.join(root, 'src/services/data-model.ts'))
const { dailyReport, activeSales, activePayments } = source(path.join(root, 'src/utils/reports.ts'))
const { buildChanges, syncService } = source(path.join(root, 'src/services/sync.service.ts'))
const line = (extra = {}) => ({ id: 'line-1', itemName: 'Cutting', quantity: 2, rate: 100, mazdoori: 50, amount: 250, mazdooriTasks: [{ id: 'task-1', title: 'Cutting labour', amount: 50, mazdoorName: 'Rashid' }], ...extra })
async function bill(customerId, extra = {}) { return db.createSale({ items: [line()], customerId, customerName: 'QA Customer', subtotal: 1, total: 1, totalMazdoori: 0, discount: 0, paidAmount: 100, remainingCredit: 0, paymentMethod: 'cash', ...extra }) }
async function customer() { return db.createCustomer({ name: 'QA Customer', mobile: '03000000000' }) }
test.beforeEach(() => { memory.clear(); signedIn = true; remoteError = null; duringUpload = null; receivedChanges = [] })
test('bill normalizes legacy worker names and recomputes totals rather than trusting UI', () => {
  const bill = prepareBill([line()], 10, 100)
  assert.equal(bill.total, 240); assert.equal(bill.subtotal, 200); assert.equal(bill.totalMazdoori, 50); assert.equal(bill.remainingCredit, 140); assert.equal(bill.items[0].mazdooriTasks[0].workerName, 'Rashid')
})
test('invalid descriptions, nonfinite values, excess discounts/payments and mismatched labour are rejected', () => {
  for (const item of [line({ itemName: '' }), line({ quantity: 0 }), line({ rate: Infinity }), line({ mazdoori: 40 })]) assert.throws(() => prepareBill([item], 0, 0))
  assert.throws(() => prepareBill([line()], 251, 0)); assert.throws(() => prepareBill([line()], 0, 251))
  assert.equal(prepareBill([line(), line({ itemName: '', rate: 0, mazdoori: 0, mazdooriTasks: [] })], 0, 0).items.length, 1)
})
test('fresh app has no demo records; sequential invoice numbers and saved item details persist', async () => {
  await db.initDatabase(); assert.equal((await db.getSales()).length, 0); assert.equal((await db.getCustomers()).length, 0)
  const c = await customer(); assert.equal(await bill(c.id), 'ARKI-1001'); assert.equal(await bill(c.id), 'ARKI-1002')
  const sales = await db.getSales(); assert.equal(sales[0].items[0].itemName, 'Cutting'); assert.equal(sales[0].items[0].mazdooriTasks[0].workerName, 'Rashid')
  assert.equal((await db.getBusinessSettings()).nextInvoiceNumber, 1003)
})
test('invoice atomically posts worker labour, customer credit, receipts and ledger', async () => {
  const c = await customer(); await bill(c.id)
  const w = (await db.getMazdoors())[0]; assert.equal(w.balance, 50); assert.equal(w.totalWork, 50)
  assert.equal((await db.getMazdooriEntries(w.id)).length, 1)
  assert.equal((await db.getCustomerById(c.id)).balance, 150)
  assert.equal((await db.getPayments())[0].amount, 100)
  assert.equal((await db.getCustomerLedger(c.id))[0].debit, 250)
})
test('failure halfway through a bill leaves every table and invoice sequence unchanged', async () => {
  await db.initDatabase(); const before = (await db.exportDatabase()).tables
  await assert.rejects(() => bill('missing-customer'), /not found/i)
  assert.deepEqual((await db.exportDatabase()).tables, before)
})
test('later receipts update customer ledger and date-based report cash collections', async () => {
  const c = await customer(); await bill(c.id); await db.receivePayment({ customerId: c.id, amount: 50, paymentMethod: 'bank' })
  assert.equal((await db.getCustomerById(c.id)).balance, 100); assert.equal((await db.getCustomerById(c.id)).totalPaid, 150)
  const rows = dailyReport(await db.getSales(), await db.getPayments()); assert.equal(rows.reduce((sum,r) => sum+r.received,0), 150)
  await assert.rejects(() => db.receivePayment({ customerId: c.id, amount: 101, paymentMethod: 'cash' }), /exceed/)
})
test('unregistered cash customer cannot leave unpaid credit', async () => {
  await assert.rejects(() => bill(null), /customer/)
  await bill(null, { paidAmount: 250 }); assert.equal((await db.getSales()).length, 1)
})
test('worker payouts and immutable void reversals retain history and correct balances', async () => {
  const w = await db.createMazdoor({ name: 'Imran' })
  const entry = await db.createMazdooriEntry({ mazdoorId: w.id, mazdoorName: w.name, workDate: '2026-10-06', workDetail: 'Polish', amount: 1000, paidAmount: 200 })
  await db.payMazdoor({ mazdoorId: w.id, amount: 300 }); assert.equal((await db.getMazdoors())[0].balance, 500)
  await db.deleteMazdooriEntry(entry.id); assert.equal((await db.getMazdoors())[0].balance, -300); assert.equal((await db.getMazdooriEntries(w.id)).length, 3)
  await assert.rejects(() => db.deleteMazdooriEntry(entry.id), /voided/)
})
test('financial history prevents deleting customers, workers and invoice-linked labour', async () => {
  const c = await customer(); await bill(c.id); const w = (await db.getMazdoors())[0]
  await assert.rejects(() => db.deleteCustomer(c.id), /history/); await assert.rejects(() => db.deleteMazdoor(w.id), /history/)
  const entry = (await db.getMazdooriEntries())[0]
  await assert.rejects(() => db.deleteMazdooriEntry(entry.id), /Invoice-linked/)
})
test('full backup restore round-trip retains children, receipts and ledgers, and saves recovery copy', async () => {
  const c = await customer(); await bill(c.id); await db.receivePayment({ customerId: c.id, amount: 50, paymentMethod: 'cash' })
  const backup = await db.exportDatabase(); validateBackup(backup)
  fs.mkdirSync(path.join(root, 'artifacts/qa'), { recursive: true })
  fs.writeFileSync(path.join(root, 'artifacts/qa/restore-fixture.json'), JSON.stringify(backup))
  await bill(c.id); await db.restoreDatabase(backup)
  assert.equal((await db.getSales()).length, 1); assert.equal((await db.getCustomerById(c.id)).balance, 100)
  assert.equal((await db.getPayments()).length, 2); assert.equal((await db.getSales())[0].items.length, 1)
  assert.equal(localStorage.getItem('arki_sync_paused'), 'true'); assert.equal(JSON.parse(localStorage.getItem('arki_pre_restore_v2')).tables.sales.length, 2)
  assert.ok((await db.getSyncQueue()).some(q => q.entityType === 'sale_items'))
})
test('corrupt backup is rejected without replacing original financial data', async () => {
  const c = await customer(); await bill(c.id)
  const backup = await db.exportDatabase(), before = structuredClone(backup.tables); backup.tables.sale_items = []
  await assert.rejects(() => db.restoreDatabase(backup), /balance|linked record/); assert.deepEqual((await db.exportDatabase()).tables, before)
})
test('sync includes all invoice children and correct raw updated customer balances', async () => {
  const c = await customer(); await bill(c.id); await db.receivePayment({ customerId: c.id, amount: 50, paymentMethod: 'cash' })
  const changes = buildChanges(await db.exportDatabase(), await db.getSyncQueue())
  for (const table of ['business_settings','customers','mazdoors','sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries']) assert.ok(changes.some(c => c.table === table), table)
  assert.equal(changes.find(c => c.table === 'customers').row.balance, 100)
  fs.mkdirSync(path.join(root, 'artifacts/qa'), { recursive: true })
  fs.writeFileSync(path.join(root, 'artifacts/qa/sync-fixture.json'), JSON.stringify(changes))
  assert.ok(changes.findIndex(c => c.table === 'sales') < changes.findIndex(c => c.table === 'sale_items'))
})
test('sync delete preserves operation; unsupported records are never silently acknowledged', async () => {
  const c = await customer(); await db.deleteCustomer(c.id)
  const changes = buildChanges(await db.exportDatabase(), await db.getSyncQueue())
  assert.equal(changes.find(x => x.table === 'customers').operation, 'DELETE')
  assert.throws(() => buildChanges(awaitless(), [{ entityType: 'unsupported', entityId: 'x' }]), /Unsupported/)
  function awaitless() { return { tables: {} } }
})
test('failed cloud RPC keeps entire queue retryable; successful retry acknowledges complete batch', async () => {
  const c = await customer(); await bill(c.id); remoteError = { message: 'Test cloud unavailable' }
  const failure = await syncService.processQueue(true); assert.ok(failure.failedCount > 0); assert.ok((await db.getSyncQueue()).every(q => q.status === 'failed'))
  remoteError = null; const success = await syncService.processQueue(true); assert.ok(success.successCount > 0); assert.equal((await db.getSyncQueue()).length, 0)
  assert.equal((await db.getCustomers())[0].syncStatus, 'synced'); assert.ok(receivedChanges.length > 5)
})
test('records created during upload remain pending for the next batch', async () => {
  const c = await customer(); await bill(c.id)
  duringUpload = async () => { await db.receivePayment({ customerId: c.id, amount: 10, paymentMethod: 'cash' }) }
  await syncService.processQueue(true)
  assert.ok((await db.getSyncQueue()).length > 0); assert.equal((await db.getCustomers())[0].syncStatus, 'pending')
})
test('signed-out and paused sync never upload or discard offline records', async () => {
  await customer(); signedIn = false; await syncService.processQueue(true); assert.equal(receivedChanges.length, 0); assert.ok((await db.getSyncQueue()).length > 0)
  signedIn = true; await syncService.pause(); await syncService.processQueue(); assert.equal(receivedChanges.length, 0)
})
test('legacy browser migration preserves source data and reconstructs item tasks and receipts', async () => {
  const legacy = [{ id: 'old-sale', invoiceNumber: 'ARKI-0999', items: [line()], subtotal: 200, totalMazdoori: 50, total: 250, discount: 0, paidAmount: 250, remainingCredit: 0, paymentMethod: 'cash', createdAt: '2026-10-01T10:00:00Z', syncStatus: 'pending' }]
  localStorage.setItem('arki_sales_v1', JSON.stringify(legacy)); await db.initDatabase()
  assert.equal((await db.getSales())[0].items[0].mazdooriTasks[0].workerName, 'Rashid')
  assert.equal((await db.getPayments())[0].amount, 250); assert.equal(localStorage.getItem('arki_sales_v1'), JSON.stringify(legacy))
})
test('SQLite schema enforces linked rows and rolls back a failed transaction', () => {
  const source = fs.readFileSync(path.join(root,'src-tauri/src/database/migrations.rs'),'utf8')
  const sql = source.match(/MIGRATION_01_SQL: &str = r#"([\s\S]*?)"#;/)[1]
  const sqlite = new DatabaseSync(':memory:'); sqlite.exec('PRAGMA foreign_keys=ON;'+sql)
  sqlite.exec("INSERT INTO customers(id,name,mobile) VALUES('c','Customer','03000000000')")
  sqlite.exec('BEGIN')
  sqlite.exec("INSERT INTO sales(id,invoice_number,total) VALUES('s','QA-1',100)")
  assert.throws(() => sqlite.exec("INSERT INTO sale_items(id,sale_id,item_name) VALUES('i','missing','Cut')"))
  sqlite.exec('ROLLBACK')
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM sales').get().count, 0); sqlite.close()
})
test('cloud and native timestamp offsets are accepted by backup validation', async () => {
  const c = await customer(); await bill(c.id)
  const backup = await db.exportDatabase(); backup.exportedAt = '2026-10-06T10:00:00+00:00'
  assert.equal(validateBackup(backup).tables.sales.length, 1)
})
test('reports and exports retain more than the former 500-invoice limit', async () => {
  const c = await customer(); await bill(c.id)
  const backup = await db.exportDatabase(), header = backup.tables.sales[0], item = backup.tables.sale_items[0]
  backup.tables.sales = Array.from({ length: 501 }, (_, i) => ({ ...header, id: 'large-' + i, invoice_number: 'LARGE-' + i }))
  backup.tables.sale_items = backup.tables.sales.map(sale => ({ ...item, id: 'item-' + sale.id, sale_id: sale.id }))
  backup.tables.sale_item_mazdoori_tasks = []
  localStorage.setItem('arki_database_v2', JSON.stringify(backup.tables))
  assert.equal((await db.getSales()).length, 501); assert.equal((await db.exportDatabase()).tables.sale_items.length, 501)
})
test('cancelling an invoice keeps it in history and reverses customer, refund, labour and reports', async () => {
  const c = await customer(); await bill(c.id); const [sale] = await db.getSales()
  await db.receivePayment({ customerId: c.id, amount: 20, paymentMethod: 'cash' })
  fs.mkdirSync(path.join(root, 'artifacts/qa'), { recursive: true })
  fs.writeFileSync(path.join(root, 'artifacts/qa/cancel-before-fixture.json'), JSON.stringify(buildChanges(await db.exportDatabase(), await db.getSyncQueue())))
  await db.cancelSale(sale.id, 'Wrong rate')
  const after = await db.getCustomerById(c.id)
  assert.equal(after.totalPurchase, 0); assert.equal(after.totalPaid, 20); assert.equal(after.balance, -20)
  const ledger = await db.getCustomerLedger(c.id), last = ledger[ledger.length - 1]
  assert.equal(last.credit, 250); assert.equal(last.debit, 100); assert.equal(last.balance, -20); assert.equal(last.saleId, sale.id); assert.match(last.description, /cancelled - Wrong rate/)
  const cancelled = (await db.getSales())[0]; assert.ok(cancelled.cancelledAt); assert.equal(cancelled.cancelReason, 'Wrong rate'); assert.equal(cancelled.items.length, 1)
  const w = (await db.getMazdoors())[0]; assert.equal(w.balance, 0); assert.equal(w.totalWork, 0); assert.equal((await db.getMazdooriEntries(w.id)).length, 2)
  const sales = await db.getSales(), payments = activePayments(await db.getPayments(), sales)
  assert.equal(activeSales(sales).length, 0); assert.equal(payments.reduce((s, p) => s + p.amount, 0), 20)
  assert.equal(dailyReport(sales, payments).reduce((s, r) => s + r.total, 0), 0)
  await assert.rejects(() => db.cancelSale(sale.id), /already cancelled/)
  validateBackup(await db.exportDatabase())
  const changes = buildChanges(await db.exportDatabase(), await db.getSyncQueue())
  assert.ok(changes.find(x => x.table === 'sales').row.cancelled_at)
  fs.writeFileSync(path.join(root, 'artifacts/qa/cancel-after-fixture.json'), JSON.stringify(changes))
})
test('cancelling a walk-in cash invoice needs no customer', async () => {
  await bill(null, { paidAmount: 250 }); const [sale] = await db.getSales()
  await db.cancelSale(sale.id); assert.ok((await db.getSales())[0].cancelledAt)
  assert.equal(activePayments(await db.getPayments(), await db.getSales()).length, 0)
})
test('expenses are validated, listed newest first, deletable, synced and backed up', async () => {
  await db.createExpense({ expenseDate: '2026-10-05', category: 'Rent', amount: 5000, paymentMethod: 'cash' })
  const bijli = await db.createExpense({ expenseDate: '2026-10-06', category: 'Electricity', description: 'October bill', amount: 1234.567, paymentMethod: 'bank' })
  assert.equal(bijli.amount, 1234.57)
  assert.deepEqual((await db.getExpenses()).map(e => e.category), ['Electricity', 'Rent'])
  for (const bad of [{ amount: 0 }, { category: ' ' }, { expenseDate: '6/10/2026' }, { paymentMethod: 'card' }]) await assert.rejects(() => db.createExpense({ expenseDate: '2026-10-06', category: 'Rent', amount: 10, paymentMethod: 'cash', ...bad }))
  const changes = buildChanges(await db.exportDatabase(), await db.getSyncQueue())
  assert.equal(changes.filter(c => c.table === 'expenses').length, 2)
  const backup = await db.exportDatabase(); validateBackup(backup)
  fs.mkdirSync(path.join(root, 'artifacts/qa'), { recursive: true })
  fs.writeFileSync(path.join(root, 'artifacts/qa/expense-fixture.json'), JSON.stringify(changes))
  await db.deleteExpense(bijli.id); assert.equal((await db.getExpenses()).length, 1)
  const deletion = buildChanges(await db.exportDatabase(), await db.getSyncQueue())
  assert.ok(deletion.some(c => c.table === 'expenses' && c.operation === 'DELETE'))
  fs.writeFileSync(path.join(root, 'artifacts/qa/expense-delete-fixture.json'), JSON.stringify(deletion))
  await db.restoreDatabase(backup); assert.equal((await db.getExpenses()).length, 2)
})
test('backups and saved data from before the expenses table still load', async () => {
  const c = await customer(); await bill(c.id)
  const backup = await db.exportDatabase(); delete backup.tables.expenses
  assert.deepEqual(validateBackup(structuredClone(backup)).tables.expenses, [])
  localStorage.setItem('arki_database_v2', JSON.stringify(backup.tables))
  assert.equal((await db.getExpenses()).length, 0); await db.createExpense({ expenseDate: '2026-10-06', category: 'Tea', amount: 100, paymentMethod: 'cash' })
  assert.equal((await db.getExpenses()).length, 1)
})
test('native migration 03 adds invoice cancellation and expenses on top of the initial schema', () => {
  const source = fs.readFileSync(path.join(root,'src-tauri/src/database/migrations.rs'),'utf8')
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys=ON;' + source.match(/MIGRATION_01_SQL: &str = r#"([\s\S]*?)"#;/)[1] + source.match(/MIGRATION_03_SQL: &str = r#"([\s\S]*?)"#;/)[1])
  sqlite.exec("INSERT INTO sales(id,invoice_number,total) VALUES('s','QA-1',100)")
  sqlite.exec("UPDATE sales SET cancelled_at=strftime('%Y-%m-%dT%H:%M:%SZ','now'), cancel_reason='Wrong' WHERE id='s'")
  assert.equal(sqlite.prepare('SELECT cancel_reason FROM sales').get().cancel_reason, 'Wrong')
  sqlite.exec("INSERT INTO expenses(id,expense_date,category,amount) VALUES('e','2026-10-06','Rent',5000)")
  assert.equal(sqlite.prepare("SELECT payment_method, sync_status FROM expenses").get().payment_method, 'cash')
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM expenses WHERE amount<=0 OR length(category)=0 OR payment_method NOT IN ('cash','bank')").get().n, 0)
  sqlite.close()
})
