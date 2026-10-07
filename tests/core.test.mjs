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
const { isValidDateKey } = source(path.join(root, 'src/utils/financial.ts'))
const { validateBackup } = source(path.join(root, 'src/services/data-model.ts'))
const { dailyReport, activeSales, activePayments } = source(path.join(root, 'src/utils/reports.ts'))
const { buildChanges, syncService } = source(path.join(root, 'src/services/sync.service.ts'))
const line = (extra = {}) => ({ id: 'line-1', itemName: 'Cutting', quantity: 2, rate: 100, mazdoori: 50, amount: 250, mazdooriTasks: [{ id: 'task-1', title: 'Cutting labour', amount: 50, mazdoorName: 'Rashid' }], ...extra })
async function bill(customerId, extra = {}) { return db.createSale({ items: [line()], customerId, customerName: 'QA Customer', subtotal: 1, total: 1, totalMazdoori: 0, discount: 0, paidAmount: 100, remainingCredit: 0, paymentMethod: 'cash', ...extra }) }
async function customer() { return db.createCustomer({ name: 'QA Customer', mobile: '03000000000' }) }
test.beforeEach(() => { memory.clear(); signedIn = true; remoteError = null; duringUpload = null; receivedChanges = [] })

test('New Bill clears edit mode from any entry point and declining keeps the complete draft', async () => {
  const { useCartStore } = source(path.join(root,'src/stores/cart.store.ts'))
  const { startNewBill } = source(path.join(root,'src/features/billing/bill-actions.ts'))
  const c = await customer(); await bill(c.id)
  useCartStore.getState().editBill((await db.getSales())[0],c)
  useCartStore.getState().updateItem(useCartStore.getState().items[0].id,{itemName:'Unsaved change'})
  const previous = useCartStore.getState()
  useCartStore.getState().setSavingBill(true)
  assert.equal(startNewBill(),false)
  useCartStore.getState().setSavingBill(false)
  const draftBeforeDeclining = useCartStore.getState()
  window.confirm = () => false
  assert.equal(startNewBill(),false); assert.equal(useCartStore.getState(),draftBeforeDeclining)
  window.confirm = () => true
  assert.equal(startNewBill(),true)
  const draft = useCartStore.getState()
  assert.equal(draft.editingSale,null); assert.equal(draft.customer,null); assert.equal(draft.items[0].itemName,''); assert.notEqual(draft.draftId,previous.draftId)
  assert.equal(startNewBill(c),true); assert.equal(useCartStore.getState().customer.id,c.id)
  useCartStore.getState().resetCart()
})

test('an inactive edit draft can save as a new bill without reusing old receipts or changing the old record', async () => {
  const { useCartStore } = source(path.join(root,'src/stores/cart.store.ts'))
  const { editBlockReason } = source(path.join(root,'src/features/billing/bill-actions.ts'))
  const c = await customer(); await bill(c.id)
  const original = (await db.getSales())[0]
  useCartStore.getState().editBill({...original,notes:'Updated from bill #ARKI-0999\nDeliver tomorrow'},c)
  useCartStore.getState().updateItem(original.items[0].id,{itemName:'Owner corrected this',rate:150})
  await db.cancelSale(original.id,'Updated: use bill #ARKI-1002')
  assert.match(editBlockReason(original.id,await db.getSales()),/old bill/)
  const before = (await db.exportDatabase()).tables.sales[0]
  useCartStore.getState().useItemsAsNewBill()
  const draft = useCartStore.getState()
  assert.equal(draft.editingSale,null); assert.equal(draft.customer.id,c.id); assert.equal(draft.paidAmount,0)
  assert.equal(draft.items[0].itemName,'Owner corrected this'); assert.equal(draft.notes,'Deliver tomorrow')
  const prepared = prepareBill(draft.items,draft.discount,draft.paidAmount)
  await db.createSale({...prepared,customerId:c.id,paymentMethod:draft.paymentMethod,notes:draft.notes})
  assert.deepEqual((await db.exportDatabase()).tables.sales.find(s=>s.id===original.id),before)
  assert.equal(activeSales(await db.getSales()).length,1)
  assert.equal(activeSales(await db.getSales())[0].total,350)
  assert.equal(activeSales(await db.getSales())[0].paidAmount,0)
  assert.equal(editBlockReason(activeSales(await db.getSales())[0].id,await db.getSales()),null)
  assert.match(editBlockReason('missing',await db.getSales()),/not found/)
  assert.match(editBlockReason(original.id,[{...original,cancelledAt:'now',cancelReason:'Wrong bill'}]),/cancelled/)
  assert.equal(editBlockReason(original.id,[{...original,createdAt:'2020-01-01T00:00:00Z'}]),null)
  useCartStore.getState().resetCart()
})

test('customer history shows entry meaning for cancelled bills, old copies, corrections and receipts regardless of sync', async () => {
  const { ledgerEntryStatus, billStatus } = source(path.join(root,'src/features/customers/entry-status.ts'))
  const c = await customer()
  await bill(c.id,{paidAmount:0})
  const first = (await db.getSales())[0]
  await db.cancelSale(first.id,'Wrong bill')
  await bill(c.id,{paidAmount:0})
  const second = activeSales(await db.getSales())[0]
  await db.updateSale(second.id,{...second,items:[line({rate:200})]})
  await db.receivePayment({customerId:c.id,amount:100,paymentMethod:'cash'})
  const sales = await db.getSales(), ledger = await db.getCustomerLedger(c.id)
  assert.deepEqual(ledger.map(entry=>ledgerEntryStatus(entry,sales).label),[
    'Cancelled','Bill Cancelled','Old Bill','Updated Bill','Bill Updated','Payment Received'
  ])
  for (const syncStatus of ['pending','synced','failed']) {
    assert.equal(ledgerEntryStatus({...ledger[5],syncStatus},sales).label,'Payment Received')
  }
  assert.equal(billStatus(sales.find(sale=>sale.invoiceNumber==='ARKI-1003')).label,'Updated Bill')
  assert.equal(billStatus({...first,cancelledAt:null}).label,'Bill Added')
})

test('legacy history statuses match full invoice numbers and do not guess bill payments from account balance', () => {
  const { ledgerEntryStatus } = source(path.join(root,'src/features/customers/entry-status.ts'))
  const sale = {id:'old',invoiceNumber:'ARKI-10',cancelledAt:'2026-10-06T00:00:00Z',cancelReason:'Updated: use bill #ARKI-11'}
  const entry = {description:'Invoice #ARKI-10',debit:100,credit:0,balance:0,syncStatus:'synced'}
  assert.equal(ledgerEntryStatus(entry,[sale]).label,'Old Bill')
  assert.equal(ledgerEntryStatus({...entry,description:'Invoice #ARKI-10 cancelled - Updated: use bill #ARKI-11',debit:0,credit:100},[sale]).label,'Bill Updated')
  assert.equal(ledgerEntryStatus({...entry,description:'Invoice #ARKI-100'},[sale]).label,'Amount Added')
  assert.equal(ledgerEntryStatus({...entry,saleId:'missing'},[sale]).label,'Amount Added')
  assert.equal(ledgerEntryStatus({...entry,description:'Opening balance',debit:0,credit:100},[]).label,'Amount Reduced')
})

test('editing a bill retains the original and corrects dues without duplicating receipts or worker payouts', async () => {
  const c = await customer(); await bill(c.id)
  const original = (await db.getSales())[0], worker = (await db.getMazdoors())[0]
  await db.receivePayment({ customerId: c.id, amount: 50, paymentMethod: 'bank' })
  await db.payMazdoor({ mazdoorId: worker.id, amount: 20, paymentMethod: 'cash' })
  const replacement = await db.updateSale(original.id, { ...original, items: [line({ quantity: 3, mazdoori: 80, mazdooriTasks: [{ id: 'changed', title: 'More cutting', amount: 80, workerName: 'Rashid' }] })] })
  assert.equal(replacement, 'ARKI-1002')
  const sales = await db.getSales(), old = sales.find(s => s.id === original.id), latest = sales.find(s => s.invoiceNumber === replacement)
  assert.equal(old.total, 250); assert.deepEqual(old.items, original.items)
  assert.ok(old.cancelledAt); assert.equal(old.cancelReason, 'Updated: use bill #ARKI-1002')
  assert.equal(latest.total, 380); assert.equal(latest.createdAt, original.createdAt)
  assert.equal((await db.getCustomerById(c.id)).balance, 230)
  assert.equal((await db.getCustomerById(c.id)).totalPaid, 150)
  const w = (await db.getMazdoors())[0]; assert.equal(w.totalWork, 80); assert.equal(w.totalPaid, 20); assert.equal(w.balance, 60)
  assert.equal(activeSales(sales).length, 1)
  assert.equal(activePayments(await db.getPayments(), sales).reduce((sum,p) => sum+p.amount,0), 150)
  validateBackup(await db.exportDatabase())
  const balance = (await db.getCustomerLedger(c.id)).reduce((sum,r) => sum+r.debit-r.credit,0)
  assert.equal(balance, 230)
})

test('editing keeps the original sale and receipt dates in daily reports', async () => {
  const c = await customer(); await bill(c.id)
  const backup = await db.exportDatabase()
  backup.tables.sales[0].created_at = '2025-01-02T09:00:00Z'
  backup.tables.payments[0].payment_date = '2025-01-02T09:01:00Z'
  backup.tables.payments[0].created_at = '2025-01-02T09:01:00Z'
  await db.restoreDatabase(backup)
  const original = (await db.getSales())[0]
  await db.updateSale(original.id, { ...original, discount: 10 })
  const sales = await db.getSales(), receipts = activePayments(await db.getPayments(),sales)
  assert.equal(receipts[0].paymentDate, '2025-01-02T09:01:00Z')
  assert.deepEqual(dailyReport(sales,receipts), [{date:'2025-01-02',bills:1,total:240,received:100,credit:140}])
})

test('editing rejects invalid totals, changed receipts/customers and inactive bills without changing any table', async () => {
  const c = await customer(); await bill(c.id)
  const original = (await db.getSales())[0]
  for (const changes of [{discount:200}, {paidAmount:110}, {paymentMethod:'bank'}, {customerId:'missing'}, {items:[line({quantity:0})]}]) {
    const before = (await db.exportDatabase()).tables
    await assert.rejects(() => db.updateSale(original.id,{...original,...changes}))
    assert.deepEqual((await db.exportDatabase()).tables,before)
  }
  await db.updateSale(original.id,{...original,discount:10})
  const before = (await db.exportDatabase()).tables
  await assert.rejects(() => db.updateSale(original.id,original), /no longer active/)
  await assert.rejects(() => db.updateSale('missing',original), /not found/i)
  assert.deepEqual((await db.exportDatabase()).tables,before)
})

test('repeated edits retain every previous version in backups and upload all linked correction records', async () => {
  const c = await customer(); await bill(c.id)
  await syncService.processQueue(true)
  const original = (await db.getSales())[0]
  await db.updateSale(original.id,{...original,discount:10})
  const second = activeSales(await db.getSales())[0]
  await db.updateSale(second.id,{...second,discount:20})
  const backup = await db.exportDatabase(), sales = await db.getSales()
  assert.equal(sales.length,3); assert.equal(activeSales(sales)[0].total,230)
  const changes = buildChanges(backup,await db.getSyncQueue())
  for (const table of ['sales','sale_items','sale_item_mazdoori_tasks','customer_ledger','mazdoori_entries','payments']) assert.ok(changes.some(c => c.table===table), table)
  await db.restoreDatabase(backup)
  assert.equal((await db.getSales()).length,3)
  assert.equal((await db.getCustomerById(c.id)).balance,130)
  assert.equal(activePayments(await db.getPayments(),await db.getSales()).length,1)
})

test('storage failure during an edit leaves the old bill, balances and sequence unchanged', async () => {
  const c = await customer(); await bill(c.id)
  const original = (await db.getSales())[0], before = (await db.exportDatabase()).tables
  const save = localStorage.setItem
  localStorage.setItem = (key,value) => { if (key === 'arki_database_v2') throw new Error('Storage full'); save(key,value) }
  try { await assert.rejects(() => db.updateSale(original.id,{...original,discount:10}), /Storage full/) }
  finally { localStorage.setItem = save }
  assert.deepEqual((await db.exportDatabase()).tables,before)
})

test('a walk-in bill can correct its description, while unpaid credit still requires a customer', async () => {
  await bill(null,{paidAmount:250})
  const original = (await db.getSales())[0]
  const before = (await db.exportDatabase()).tables
  await assert.rejects(() => db.updateSale(original.id,{...original,items:[line({rate:150})]}), /customer/i)
  assert.deepEqual((await db.exportDatabase()).tables,before)
  await db.updateSale(original.id,{...original,items:[line({itemName:'Correct description'})]})
  assert.equal(activeSales(await db.getSales())[0].items[0].itemName,'Correct description')
  assert.equal(activePayments(await db.getPayments(),await db.getSales()).reduce((sum,p)=>sum+p.amount,0),250)
})

test('Edit Bill loads a separate draft and New Bill clears the old customer, items, payment and edit state', async () => {
  const { useCartStore } = source(path.join(root,'src/stores/cart.store.ts'))
  const c = await customer(); await bill(c.id)
  const original = (await db.getSales())[0]
  useCartStore.getState().editBill(original,c)
  useCartStore.getState().updateItem(original.items[0].id,{rate:200})
  assert.equal(original.items[0].rate,100)
  assert.equal(useCartStore.getState().editingSale.items[0].rate,100)
  useCartStore.getState().resetCart()
  const draft = useCartStore.getState()
  assert.equal(draft.editingSale,null); assert.equal(draft.customer,null)
  assert.equal(draft.items.length,1); assert.equal(draft.items[0].itemName,'')
  assert.equal(draft.paidAmount,0); assert.equal(draft.discount,0); assert.equal(draft.notes,'')
})
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
test('money edge: decimal line values and a fully-paid bill round to two decimals without credit residue', () => {
  const decimal = line({ quantity: 3, rate: 0.1, mazdoori: 0.2, amount: 0, mazdooriTasks: [] })
  const result = prepareBill([decimal], 0, 0.5)
  assert.equal(result.subtotal, 0.3); assert.equal(result.totalMazdoori, 0.2)
  assert.equal(result.total, 0.5); assert.equal(result.remainingCredit, 0)
})
test('calendar edge: impossible dates are rejected while leap-day records are accepted', async () => {
  assert.equal(isValidDateKey('2024-02-29'), true)
  for (const value of ['2023-02-29', '2026-00-01', '2026-13-01', '2026-04-31', '06-10-2026']) assert.equal(isValidDateKey(value), false)
  const worker = await db.createMazdoor({ name: 'Date Worker' })
  await assert.rejects(() => db.createMazdooriEntry({ mazdoorId: worker.id, mazdoorName: worker.name, workDate: '2026-02-29', workDetail: 'Bad date', amount: 1, paidAmount: 0 }), /valid date/)
  await db.createMazdooriEntry({ mazdoorId: worker.id, mazdoorName: worker.name, workDate: '2024-02-29', workDetail: 'Leap-day work', amount: 1, paidAmount: 0 })
  await assert.rejects(() => db.createExpense({ expenseDate: '2026-04-31', category: 'Fuel', amount: 1, paymentMethod: 'cash' }), /valid expense date/)
})
test('backup edge: duplicate invoice number, malformed calendar date and unknown table are rejected before restore', async () => {
  const customer = await db.createCustomer({ name: 'Backup Customer', mobile: '03000000000' })
  await bill(customer.id)
  const sourceBackup = await db.exportDatabase()
  const duplicate = structuredClone(sourceBackup)
  duplicate.tables.sales.push({ ...duplicate.tables.sales[0], id: 'duplicate-sale' })
  assert.throws(() => validateBackup(duplicate), /Duplicate invoice/)
  const invalidDate = structuredClone(sourceBackup)
  invalidDate.tables.expenses = [{ id: 'expense', expense_date: '2026-02-31', category: 'Fuel', amount: 100, payment_method: 'cash' }]
  assert.throws(() => validateBackup(invalidDate), /Invalid expense/)
  const unknown = structuredClone(sourceBackup); unknown.tables.attack = []
  assert.throws(() => validateBackup(unknown), /Unknown backup table/)
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

// ---- Edge cases: invoice cancellation ----
const { formatPKR } = source(path.join(root, 'src/utils/financial.ts'))
test('cancel edge: unknown invoice is rejected and nothing changes', async () => {
  const c = await customer(); await bill(c.id)
  const before = (await db.exportDatabase()).tables
  await assert.rejects(() => db.cancelSale('no-such-sale'), /not found/i)
  assert.deepEqual((await db.exportDatabase()).tables, before)
})
test('cancel edge: discount, several labour tasks and a payout reverse only that invoice', async () => {
  const c = await customer()
  const items = [
    line({ id: 'a', mazdoori: 50, mazdooriTasks: [{ id: 't1', title: 'Cut', amount: 30, workerName: 'Rashid' }, { id: 't2', title: 'Bend', amount: 20, workerName: 'Imran' }] }),
    line({ id: 'b', itemName: 'Weld', quantity: 1, rate: 300, mazdoori: 40, mazdooriTasks: [{ id: 't3', title: 'Weld', amount: 40, workerName: 'rashid' }] }),
  ]
  await bill(c.id, { items, discount: 90 }) // 590 - 90 = 500, paid 100
  await bill(c.id) // 250, paid 100, Rashid +50
  const [, first] = await db.getSales()
  assert.equal(first.total, 500)
  const rashid = async () => (await db.getMazdoors()).find(w => w.name === 'Rashid')
  assert.equal((await rashid()).balance, 120)
  await db.payMazdoor({ mazdoorId: (await rashid()).id, amount: 100 })
  await db.cancelSale(first.id)
  const r = await rashid(), imran = (await db.getMazdoors()).find(w => w.name === 'Imran')
  assert.equal(r.totalWork, 50); assert.equal(r.balance, -50); assert.equal(imran.balance, 0)
  const cust = await db.getCustomerById(c.id)
  assert.equal(cust.totalPurchase, 250); assert.equal(cust.totalPaid, 100); assert.equal(cust.balance, 150)
  validateBackup(await db.exportDatabase())
})
test('cancel edge: ledger columns still add up to the balance after mixed activity', async () => {
  const c = await customer()
  await bill(c.id); await bill(c.id, { paidAmount: 0 }); await db.receivePayment({ customerId: c.id, amount: 120, paymentMethod: 'bank' })
  const [second, first] = await db.getSales()
  await db.cancelSale(first.id, '   ')
  await db.cancelSale(second.id)
  const ledger = await db.getCustomerLedger(c.id), cust = await db.getCustomerById(c.id)
  assert.equal(Math.round(ledger.reduce((s, e) => s + e.debit - e.credit, 0) * 100) / 100, cust.balance)
  assert.equal(ledger.at(-1).balance, cust.balance); assert.equal(cust.balance, -120)
  assert.equal((await db.getSales()).find(s => s.id === first.id).cancelReason, null)
  assert.equal(dailyReport(await db.getSales(), activePayments(await db.getPayments(), await db.getSales())).reduce((s, r) => s + r.total, 0), 0)
})
test('cancel edge: invoice numbers are never reused after a cancellation', async () => {
  const c = await customer(); await bill(c.id); await db.cancelSale((await db.getSales())[0].id)
  assert.equal(await bill(c.id), 'ARKI-1002')
})
test('cancel edge: cancelling an already-synced invoice uploads only the changed rows with their parents', async () => {
  const c = await customer(); await bill(c.id)
  fs.mkdirSync(path.join(root, 'artifacts/qa'), { recursive: true })
  fs.writeFileSync(path.join(root, 'artifacts/qa/cancel-initial-fixture.json'), JSON.stringify(buildChanges(await db.exportDatabase(), await db.getSyncQueue())))
  await syncService.processQueue(true); assert.equal((await db.getSyncQueue()).length, 0)
  const [sale] = await db.getSales(); await db.cancelSale(sale.id, 'Duplicate')
  const changes = buildChanges(await db.exportDatabase(), await db.getSyncQueue())
  const tables = new Set(changes.map(x => x.table))
  for (const t of ['sales', 'customers', 'customer_ledger', 'mazdoors', 'mazdoori_entries']) assert.ok(tables.has(t), t)
  assert.ok(!tables.has('sale_items') && !tables.has('payments'))
  assert.ok(changes.every(x => x.operation === 'UPSERT'))
  fs.writeFileSync(path.join(root, 'artifacts/qa/cancel-incremental-fixture.json'), JSON.stringify(changes))
  await syncService.processQueue(true); assert.equal((await db.getSyncQueue()).length, 0)
  assert.equal((await db.getSales())[0].syncStatus, 'synced')
})
test('money formatting never shows a negative zero', () => {
  assert.equal(formatPKR(-0), 'Rs 0'); assert.equal(formatPKR(-0.004), 'Rs 0'); assert.equal(formatPKR(-20), 'Rs -20')
})
