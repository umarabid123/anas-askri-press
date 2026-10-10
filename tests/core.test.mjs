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
const authListeners = new Set(), networkListeners = new Map()
const remote = { auth: {
  getSession: async () => ({ data: { session: signedIn ? { user: {} } : null } }),
  onAuthStateChange: callback => { authListeners.add(callback); return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } } },
}, rpc: async (_, { changes }) => { receivedChanges = changes; if (duringUpload) await duringUpload(); return { error: remoteError } } }
const mocks = { 'services/supabase.ts': { isSupabaseConfigured: () => true, syncCloudChanges: async changes => { const { error } = await remote.rpc('sync_shop_records', { changes }); if (error) throw new Error(error.message) } } }
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
globalThis.window = {
  addEventListener(name, callback) { if (!networkListeners.has(name)) networkListeners.set(name, new Set()); networkListeners.get(name).add(callback) },
  removeEventListener(name, callback) { networkListeners.get(name)?.delete(callback) },
}
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
test.beforeEach(() => { syncService.cleanup(); memory.clear(); signedIn = true; navigator.onLine = true; remoteError = null; duringUpload = null; receivedChanges = [] })
test.afterEach(() => syncService.cleanup())

async function waitForSync(condition) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await condition()) return
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  assert.fail('Automatic sync did not reach the expected state')
}
function network(online) {
  navigator.onLine = online
  for (const callback of networkListeners.get(online ? 'online' : 'offline') || []) callback()
}

test('auto sync preserves offline records across restart and uploads immediately on reconnect', async () => {
  navigator.onLine = false
  const c = await customer(); await bill(c.id)
  const saved = (await db.exportDatabase()).tables
  syncService.start(); syncService.start()
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(receivedChanges.length, 0)
  assert.deepEqual((await db.exportDatabase()).tables, saved)
  syncService.cleanup(); syncService.start()
  assert.equal(networkListeners.get('online').size, 1)
  network(true)
  await waitForSync(async () => (await db.getSyncQueue()).length === 0)
  assert.ok(receivedChanges.some(change => change.table === 'sales'))
  network(false)
  await db.receivePayment({ customerId: c.id, amount: 10, paymentMethod: 'cash' })
  assert.ok((await db.getSyncQueue()).length > 0)
  network(true)
  await waitForSync(async () => (await db.getSyncQueue()).length === 0)
  assert.equal((await db.getPayments()).length, 2)
})

test('auto sync retries a failed upload on reconnect without waiting for backoff', async () => {
  await customer(); remoteError = { message: 'Network dropped during upload' }
  syncService.start()
  await waitForSync(async () => (await db.getSyncQueue()).every(row => row.status === 'failed'))
  remoteError = null
  network(false); network(true)
  await waitForSync(async () => (await db.getSyncQueue()).length === 0)
  assert.equal(syncService.getError(), null)
  assert.equal((await db.getCustomers()).length, 1)
})

test('auto sync needs no sign-in, respects restore pause and cleans up listeners', async () => {
  signedIn = false; await customer()
  syncService.start()
  await waitForSync(async () => (await db.getSyncQueue()).length === 0)
  assert.ok(receivedChanges.length > 0)
  await syncService.pause(); await customer(); network(true)
  await new Promise(resolve => setTimeout(resolve, 30))
  assert.ok((await db.getSyncQueue()).length > 0)
  assert.equal(localStorage.getItem('arki_sync_paused'), 'true')
  syncService.cleanup()
  assert.equal(authListeners.size, 0)
  assert.equal(networkListeners.get('online').size, 0)
  assert.equal(networkListeners.get('offline').size, 0)
})

test('auto sync drains changes saved during an upload in the next automatic batch', async () => {
  const c = await customer(); await bill(c.id)
  duringUpload = async () => { duringUpload = null; await db.receivePayment({ customerId: c.id, amount: 10, paymentMethod: 'cash' }) }
  syncService.start()
  await waitForSync(async () => (await db.getSyncQueue()).length === 0)
  assert.ok(receivedChanges.some(change => change.table === 'payments' && change.row.amount === 10))
  assert.equal((await db.getCustomers())[0].balance, 90)
})

test('correcting an incorrectly paid bill to zero updates receipt, customer dues and ledger atomically', async () => {
  const c = await customer()
  await bill(c.id, { paidAmount: 1000, items: [line({ quantity: 1, rate: 1000 })] })
  const original = (await db.getSales())[0]
  const number = await db.updateSale(original.id, { ...original, paidAmount: 0 })
  const corrected = (await db.getSales())[0]
  assert.equal(number, original.invoiceNumber); assert.equal((await db.getSales()).length, 1)
  assert.equal(corrected.paidAmount, 0); assert.equal(corrected.remainingCredit, 1000)
  assert.equal((await db.getPayments()).length, 0)
  const account = await db.getCustomerById(c.id)
  assert.equal(account.totalPurchase, 1000); assert.equal(account.totalPaid, 0); assert.equal(account.balance, 1000)
  const ledger = await db.getCustomerLedger(c.id)
  assert.equal(ledger[0].credit, 0); assert.equal(ledger[0].debit, 1000); assert.equal(ledger[0].balance, 1000)
  assert.equal(corrected.items[0].mazdooriTasks[0].workerName, 'Rashid')
  assert.equal((await db.getMazdoors())[0].balance, 50)
  validateBackup(await db.exportDatabase())
  await db.updateSale(corrected.id, { ...corrected, paidAmount: 500 })
  assert.equal((await db.getPayments())[0].amount, 500)
  assert.equal((await db.getCustomerById(c.id)).balance, 500)
  await db.updateSale(corrected.id, { ...corrected, paidAmount: 500 })
  assert.equal((await db.getPayments()).length, 1)
  assert.equal((await db.getCustomerById(c.id)).balance, 500)
})

test('payment corrections preserve later receipts and adjust later running balances without changing their credits', async () => {
  const c = await customer()
  await bill(c.id, { paidAmount: 500, items: [line({ quantity: 1, rate: 2000 })] })
  const original = (await db.getSales())[0]
  await db.receivePayment({ customerId: c.id, saleId: original.id, amount: 200, paymentMethod: 'bank' })
  await bill(c.id, { paidAmount: 0 })
  await db.receivePayment({ customerId: c.id, amount: 50, paymentMethod: 'cash' })
  const updated = (await db.getSales()).find(s => s.id === original.id)
  const before = (await db.exportDatabase()).tables
  await assert.rejects(() => db.updateSale(original.id, { ...updated, paidAmount: 0 }), /Later payments/)
  assert.deepEqual((await db.exportDatabase()).tables, before)
  const receiptBefore = (await db.getPayments()).filter(r => r.paymentMethod === 'bank' || !r.saleId)
  await db.updateSale(original.id, { ...updated, paidAmount: 200 })
  assert.deepEqual((await db.getPayments()), receiptBefore)
  assert.equal((await db.getCustomerById(c.id)).balance, 1950)
  const ledger = await db.getCustomerLedger(c.id)
  assert.equal(ledger[0].credit, 0); assert.equal(ledger[0].balance, 2000)
  assert.equal(ledger[1].credit, 200); assert.equal(ledger[1].balance, 1800)
  assert.equal(ledger.at(-1).credit, 50); assert.equal(ledger.at(-1).balance, 1950)
  const { previousInvoiceBalance } = source(path.join(root, 'src/features/billing/invoice-data.ts'))
  const nextBill = (await db.getSales()).find(s => s.id !== original.id)
  assert.equal(previousInvoiceBalance({ saleId: nextBill.id, invoiceNumber: nextBill.invoiceNumber }, ledger), 1800)
  validateBackup(await db.exportDatabase())
})

test('invoice includes previous dues once and retains its account snapshot after later bills and payments', async () => {
  const { saleToInvoiceData, previousInvoiceBalance, invoiceAccountTotals } = source(path.join(root, 'src/features/billing/invoice-data.ts'))
  const c = await customer()
  await bill(c.id, { paidAmount: 0, items: [line({ quantity: 1, rate: 5000, mazdoori: 0, mazdooriTasks: [] })] })
  await bill(c.id, { paidAmount: 500, items: [line({ quantity: 1, rate: 2000, mazdoori: 230, mazdooriTasks: [] })] })
  const current = (await db.getSales())[0]
  const invoice = saleToInvoiceData(current, await db.getCustomerById(c.id))
  const beforePreview = (await db.exportDatabase()).tables
  invoice.previousBalance = previousInvoiceBalance(invoice, await db.getCustomerLedger(c.id))
  assert.deepEqual(invoiceAccountTotals(invoice), { previousBalance: 5000, total: 7000, balance: 6500, advance: 0 })
  assert.equal(invoice.total, 2000); assert.equal(current.remainingCredit, 1500)
  assert.equal((await db.getCustomerById(c.id)).balance, 6500)
  assert.deepEqual((await db.exportDatabase()).tables, beforePreview)
  await db.receivePayment({ customerId: c.id, amount: 1000, paymentMethod: 'cash' })
  await bill(c.id, { paidAmount: 0, items: [line({ quantity: 1, rate: 3000, mazdoori: 0, mazdooriTasks: [] })] })
  assert.equal(previousInvoiceBalance(invoice, await db.getCustomerLedger(c.id)), 5000)
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
  const { ShopInvoiceTemplate } = source(path.join(root, 'src/features/billing/components/ShopInvoiceTemplate.tsx'))
  for (const receiptPaperSize of ['A4', '80mm', '58mm']) {
    const html = renderToStaticMarkup(React.createElement(ShopInvoiceTemplate, { data: invoice, settings: { ...db.DEFAULT_SETTINGS, receiptPaperSize } }))
    assert.match(html, /2,000/); assert.match(html, /Previous Dues/); assert.match(html, /5,000/); assert.match(html, /7,000/); assert.match(html, /6,500/)
    assert.doesNotMatch(html, /Mazdoori|230/)
  }
})

test('invoice account totals handle walk-ins, discounts, advance balances and exact legacy ledger matches', () => {
  const { previousInvoiceBalance, invoiceAccountTotals } = source(path.join(root, 'src/features/billing/invoice-data.ts'))
  assert.deepEqual(invoiceAccountTotals({ total: 2000, paidAmount: 2000 }), { previousBalance: 0, total: 2000, balance: 0, advance: 0 })
  assert.equal(invoiceAccountTotals({ total: 1950, previousBalance: 5000, paidAmount: 500 }).total, 6950)
  assert.deepEqual(invoiceAccountTotals({ total: 2000, previousBalance: -3000, paidAmount: 0 }), { previousBalance: -3000, total: 0, balance: 0, advance: 1000 })
  assert.equal(previousInvoiceBalance({ invoiceNumber: 'ARKI-1001' }, [{ description: 'Invoice #ARKI-10010', balance: 9999, debit: 100, credit: 0 }, { description: 'Invoice #ARKI-1001', balance: 6800, debit: 2000, credit: 200 }]), 5000)
  assert.throws(() => previousInvoiceBalance({ invoiceNumber: 'missing' }, []), /customer account/)
})

test('internal mazdoori persists but never increases the new customer bill, dues or cart total', async () => {
  const { useCartStore } = source(path.join(root, 'src/stores/cart.store.ts'))
  useCartStore.getState().resetCart()
  const itemId = useCartStore.getState().items[0].id
  useCartStore.getState().updateItem(itemId, { itemName: 'Sheet', quantity: 1, rate: 78, mazdoori: 230 })
  assert.equal(useCartStore.getState().items[0].amount, 78)
  assert.equal(useCartStore.getState().getTotal(), 78)
  assert.equal(useCartStore.getState().getCredit(), 78)
  useCartStore.getState().updateItem(itemId, { mazdoori: 999 })
  assert.equal(useCartStore.getState().getTotal(), 78)
  useCartStore.getState().resetCart()
  const c = await customer()
  await bill(c.id, { paidAmount: 0, items: [line({ quantity: 1, rate: 78, mazdoori: 230, mazdooriTasks: [{ id: 'work', title: 'Internal work', amount: 230, workerName: 'Worker' }] })] })
  const [sale] = await db.getSales()
  assert.equal(sale.total, 78); assert.equal(sale.subtotal, 78); assert.equal(sale.remainingCredit, 78)
  assert.equal(sale.totalMazdoori, 230); assert.equal(sale.items[0].mazdoori, 230)
  assert.equal((await db.getCustomerById(c.id)).balance, 78)
  assert.equal((await db.getCustomerLedger(c.id))[0].debit, 78)
  assert.equal((await db.getMazdoors())[0].totalWork, 230)
  const backup = await db.exportDatabase()
  await db.restoreDatabase(backup)
  assert.equal((await db.getSales())[0].items[0].mazdoori, 230)
  await assert.rejects(() => bill(c.id, { paidAmount: 79, items: [line({ quantity: 1, rate: 78, mazdoori: 230, mazdooriTasks: [] })] }), /bill total/)
})

test('customer invoice hides internal mazdoori and worker details on A4 and thermal paper', () => {
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const { ShopInvoiceTemplate } = source(path.join(root, 'src/features/billing/components/ShopInvoiceTemplate.tsx'))
  const data = { invoiceNumber: 'QA-1', date: '2026-10-08', items: [line({ quantity: 1, rate: 78, amount: 78, mazdoori: 230, mazdooriTasks: [{ id: 'task', title: 'Private worker task', workerName: 'Private Worker', amount: 230 }] })], subtotal: 78, totalMazdoori: 230, discount: 0, total: 78, paidAmount: 0, remainingCredit: 78, paymentMethod: 'cash' }
  for (const receiptPaperSize of ['A4', '80mm', '58mm']) {
    const html = renderToStaticMarkup(React.createElement(ShopInvoiceTemplate, { data, settings: { ...db.DEFAULT_SETTINGS, receiptPaperSize } }))
    assert.doesNotMatch(html, /Mazdoori|Labour|Labor|labour|Private Worker|Private worker task|230/)
    assert.match(html, /78/)
  }
})

test('legacy bills with included labour restore unchanged alongside new internal labour bills', async () => {
  await db.initDatabase()
  localStorage.setItem('arki_sales_v1', JSON.stringify([{ id: 'legacy', invoiceNumber: 'OLD-1', items: [line()], subtotal: 200, totalMazdoori: 50, total: 250, discount: 0, paidAmount: 250, remainingCredit: 0, paymentMethod: 'cash', createdAt: '2026-10-01T10:00:00Z', syncStatus: 'pending' }]))
  localStorage.removeItem('arki_database_v2')
  await db.initDatabase()
  await bill(null, { paidAmount: 200 })
  const backup = await db.exportDatabase()
  validateBackup(backup)
  await db.restoreDatabase(backup)
  assert.equal((await db.getSales()).find(s => s.id === 'legacy').total, 250)
  assert.equal((await db.getSales()).find(s => s.id !== 'legacy').total, 200)
  const corrupt = structuredClone(backup)
  corrupt.tables.sale_items[0].amount = 999
  assert.throws(() => validateBackup(corrupt), /balance|item/)
})

test('product search supports English and Urdu and bilingual descriptions survive billing and backup', async () => {
  const { PRODUCTS, productName, searchProducts } = source(path.join(root, 'src/constants/products.ts'))
  assert.equal(searchProducts('  STEEL SHEET  ')[0].id, 'chadar')
  assert.equal(searchProducts('چوکھٹ')[0].id, 'chowkhat')
  assert.equal(searchProducts('جالی')[0].id, 'laser-grill')
  assert.equal(searchProducts('unlisted custom product').length, 0)
  assert.equal(searchProducts(productName(PRODUCTS[0])).length, PRODUCTS.length)
  const c = await customer()
  const name = productName(PRODUCTS[0])
  await bill(c.id, { items: [line({ itemName: name })] })
  assert.equal((await db.getSales())[0].items[0].itemName, name)
  const backup = await db.exportDatabase()
  await db.restoreDatabase(backup)
  assert.equal((await db.getSales())[0].items[0].itemName, name)
  await bill(c.id, { items: [line({ itemName: 'Custom Sheet 8x4 / خاص چادر' })] })
  assert.equal((await db.getSales())[0].items[0].itemName, 'Custom Sheet 8x4 / خاص چادر')
})

test('saved shop details publish immediately, persist on reload and reject invalid changes', async () => {
  const { useBusinessSettingsStore } = source(path.join(root, 'src/stores/business-settings.store.ts'))
  const initial = await db.getBusinessSettings()
  let notifications = 0
  const unsubscribe = useBusinessSettingsStore.subscribe(() => { notifications++ })
  const updated = await db.updateBusinessSettings({ ...initial, businessName: 'QA Print Shop', subtitle: '', phone: '03001234567', address: 'QA Shop Address', footerText: '' })
  assert.equal(notifications, 1)
  assert.deepEqual(useBusinessSettingsStore.getState().settings, updated)
  assert.equal((await db.getBusinessSettings()).businessName, 'QA Print Shop')
  assert.equal((await db.getBusinessSettings()).subtitle, '')
  const saved = useBusinessSettingsStore.getState().settings
  await assert.rejects(db.updateBusinessSettings({ ...saved, businessName: ' ' }), /shop name/)
  assert.equal(useBusinessSettingsStore.getState().settings, saved)
  unsubscribe()
})

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
  assert.equal(activeSales(await db.getSales())[0].total,300)
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
    'Cancelled','Bill Cancelled','Bill Added','Payment Received'
  ])
  for (const syncStatus of ['pending','synced','failed']) {
    assert.equal(ledgerEntryStatus({...ledger[3],syncStatus},sales).label,'Payment Received')
  }
  assert.equal(billStatus(sales.find(sale=>sale.id===second.id)).label,'Bill Added')
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
  const updated = await db.updateSale(original.id, { ...original, items: [line({ quantity: 3, mazdoori: 80, mazdooriTasks: [{ id: 'changed', title: 'More cutting', amount: 80, workerName: 'Rashid' }] })] })
  assert.equal(updated, original.invoiceNumber)
  const sales = await db.getSales(), latest = sales.find(s => s.id === original.id)
  assert.equal(latest.total, 300); assert.equal(latest.createdAt, original.createdAt)
  assert.equal((await db.getCustomerById(c.id)).balance, 150)
  assert.equal((await db.getCustomerById(c.id)).totalPaid, 150)
  const w = (await db.getMazdoors())[0]; assert.equal(w.totalWork, 50); assert.equal(w.totalPaid, 20); assert.equal(w.balance, 30)
  assert.equal(activeSales(sales).length, 1)
  assert.equal(activePayments(await db.getPayments(), sales).reduce((sum,p) => sum+p.amount,0), 150)
  validateBackup(await db.exportDatabase())
  const balance = (await db.getCustomerLedger(c.id)).reduce((sum,r) => sum+r.debit-r.credit,0)
  assert.equal(balance, 150)
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
  assert.deepEqual(dailyReport(sales,receipts), [{date:'2025-01-02',bills:1,total:190,received:100,credit:90}])
})

test('editing rejects invalid totals, changed receipts/customers and inactive bills without changing any table', async () => {
  const c = await customer(); await bill(c.id)
  const original = (await db.getSales())[0]
  for (const changes of [{discount:201}, {paidAmount:250}, {customerId:'missing'}, {items:[line({quantity:0})]}]) {
    const before = (await db.exportDatabase()).tables
    await assert.rejects(() => db.updateSale(original.id,{...original,...changes}))
    assert.deepEqual((await db.exportDatabase()).tables,before)
  }
  await db.updateSale(original.id,{...original,discount:10})
  await db.cancelSale(original.id)
  const before = (await db.exportDatabase()).tables
  await assert.rejects(() => db.updateSale(original.id,original), /cancelled/)
  await assert.rejects(() => db.updateSale('missing',original), /not found/i)
  assert.deepEqual((await db.exportDatabase()).tables,before)
})

test('repeated edits retain every previous version in backups and upload all linked correction records', async () => {
  const c = await customer(); await bill(c.id)
  await syncService.processQueue(true)
  const original = (await db.getSales())[0]
  await db.updateSale(original.id,{...original,discount:10})
  await db.updateSale(original.id,{...original,discount:20})
  const backup = await db.exportDatabase(), sales = await db.getSales()
  assert.equal(sales.length,1); assert.equal(activeSales(sales)[0].total,180)
  const changes = buildChanges(backup,await db.getSyncQueue())
  for (const table of ['sales','sale_items','customer_ledger','payments']) assert.ok(changes.some(c => c.table===table), table)
  await db.restoreDatabase(backup)
  assert.equal((await db.getSales()).length,1)
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
  await bill(null,{paidAmount:200})
  const original = (await db.getSales())[0]
  const before = (await db.exportDatabase()).tables
  await assert.rejects(() => db.updateSale(original.id,{...original,items:[line({rate:150})]}), /customer/i)
  assert.deepEqual((await db.exportDatabase()).tables,before)
  await db.updateSale(original.id,{...original,items:[line({itemName:'Correct description'})]})
  assert.equal(activeSales(await db.getSales())[0].items[0].itemName,'Correct description')
  assert.equal(activePayments(await db.getPayments(),await db.getSales()).reduce((sum,p)=>sum+p.amount,0),200)
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
  assert.equal(bill.total, 190); assert.equal(bill.subtotal, 200); assert.equal(bill.totalMazdoori, 50); assert.equal(bill.remainingCredit, 90); assert.equal(bill.items[0].mazdooriTasks[0].workerName, 'Rashid')
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
  assert.equal((await db.getCustomerById(c.id)).balance, 100)
  assert.equal((await db.getPayments())[0].amount, 100)
  assert.equal((await db.getCustomerLedger(c.id))[0].debit, 200)
})
test('failure halfway through a bill leaves every table and invoice sequence unchanged', async () => {
  await db.initDatabase(); const before = (await db.exportDatabase()).tables
  await assert.rejects(() => bill('missing-customer'), /not found/i)
  assert.deepEqual((await db.exportDatabase()).tables, before)
})
test('later receipts update customer ledger and date-based report cash collections', async () => {
  const c = await customer(); await bill(c.id); await db.receivePayment({ customerId: c.id, amount: 50, paymentMethod: 'bank' })
  assert.equal((await db.getCustomerById(c.id)).balance, 50); assert.equal((await db.getCustomerById(c.id)).totalPaid, 150)
  const rows = dailyReport(await db.getSales(), await db.getPayments()); assert.equal(rows.reduce((sum,r) => sum+r.received,0), 150)
  await assert.rejects(() => db.receivePayment({ customerId: c.id, amount: 101, paymentMethod: 'cash' }), /exceed/)
})
test('unregistered cash customer cannot leave unpaid credit', async () => {
  await assert.rejects(() => bill(null), /customer/)
  await bill(null, { paidAmount: 200 }); assert.equal((await db.getSales()).length, 1)
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
  assert.equal((await db.getSales()).length, 1); assert.equal((await db.getCustomerById(c.id)).balance, 50)
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
  assert.equal(changes.find(c => c.table === 'customers').row.balance, 50)
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
test('ENV-based sync uploads without user auth and a restore pause still protects records', async () => {
  await customer(); signedIn = false; await syncService.processQueue(true)
  assert.ok(receivedChanges.length > 0); assert.equal((await db.getSyncQueue()).length, 0)
  await syncService.pause(); await customer(); receivedChanges = []
  await syncService.processQueue(); assert.equal(receivedChanges.length, 0)
  assert.ok((await db.getSyncQueue()).length > 0)
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
  const result = prepareBill([decimal], 0, 0.3)
  assert.equal(result.subtotal, 0.3); assert.equal(result.totalMazdoori, 0.2)
  assert.equal(result.total, 0.3); assert.equal(result.remainingCredit, 0)
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
  assert.equal(last.credit, 200); assert.equal(last.debit, 100); assert.equal(last.balance, -20); assert.equal(last.saleId, sale.id); assert.match(last.description, /cancelled - Wrong rate/)
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
  await bill(null, { paidAmount: 200 }); const [sale] = await db.getSales()
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
  assert.equal(first.total, 410)
  const rashid = async () => (await db.getMazdoors()).find(w => w.name === 'Rashid')
  assert.equal((await rashid()).balance, 120)
  await db.payMazdoor({ mazdoorId: (await rashid()).id, amount: 100 })
  await db.cancelSale(first.id)
  const r = await rashid(), imran = (await db.getMazdoors()).find(w => w.name === 'Imran')
  assert.equal(r.totalWork, 50); assert.equal(r.balance, -50); assert.equal(imran.balance, 0)
  const cust = await db.getCustomerById(c.id)
  assert.equal(cust.totalPurchase, 200); assert.equal(cust.totalPaid, 100); assert.equal(cust.balance, 100)
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


test('mazdoori weekly history groups saved bills, preserves detail and updates corrected totals', () => {
  const { mazdooriWeeks, mazdooriDay } = source(path.join(root, 'src/features/mazdoori/period.ts'))
  const row = (id, date, amount, extra = {}) => ({ id, createdAt: date + 'T12:00:00', totalMazdoori: amount, items: [line()], ...extra })
  const records = [row('thursday', '2026-10-08', 100), row('saturday', '2026-10-03', 25.5), row('friday', '2026-10-09', 900), row('next-week', '2026-10-10', 200), row('cancelled', '2026-10-06', 999, { cancelledAt: '2026-10-06T13:00:00' }), row('old-year', '2025-12-30', 50), row('no-labor', '2026-10-07', 0)]
  const before = structuredClone(records)
  const weeks = mazdooriWeeks(records)
  assert.deepEqual(weeks.map(week => week.from), ['2026-10-10', '2026-10-03', '2025-12-27'])
  assert.equal(weeks[1].to, '2026-10-08')
  assert.equal(weeks[1].total, 125.5); assert.equal(weeks[1].days, 2); assert.equal(weeks[1].bills, 2)
  assert.deepEqual(weeks[1].sales.map(sale => sale.id), ['saturday', 'cancelled', 'thursday'])
  assert.deepEqual(weeks[1].sales[0].items, records[1].items)
  assert.deepEqual(records, before)
  assert.deepEqual(mazdooriWeeks(JSON.parse(JSON.stringify(records))), weeks)
  records[0].totalMazdoori = 150
  assert.equal(mazdooriWeeks(records)[1].total, 175.5)
  assert.equal(mazdooriDay('2026-10-06T12:00:00'), 'Tuesday')
  assert.equal(mazdooriDay('2026-10-07T12:00:00'), 'Wednesday')
  assert.deepEqual(mazdooriWeeks([]), [])
})

test('mazdoori weekly history remains available after a local backup restore', async () => {
  const { mazdooriWeeks } = source(path.join(root, 'src/features/mazdoori/period.ts'))
  const c = await customer(); await bill(c.id)
  const before = mazdooriWeeks(await db.getSales())
  await db.restoreDatabase(await db.exportDatabase())
  assert.deepEqual(mazdooriWeeks(await db.getSales()), before)
})

test('mazdoori ledger carries chronological labor and weight totals across days and pages', () => {
  const { mazdooriLedger, mazdooriWeeks } = source(path.join(root, 'src/features/mazdoori/period.ts'))
  const records = Array.from({ length: 12 }, (_, i) => ({
    id: String(i).padStart(2, '0'), createdAt: `2026-10-${i < 6 ? '03' : '08'}T12:${String(i).padStart(2, '0')}:00`,
    totalMazdoori: 10.25, items: [line({ quantity: 0.1 }), line({ quantity: 0.2, mazdoori: 0 })],
  }))
  records.push({ id: 'cancelled', createdAt: '2026-10-05T12:00:00', totalMazdoori: 999, items: [line({ quantity: 999 })], cancelledAt: '2026-10-05T13:00:00' })
  records.reverse()
  const before = structuredClone(records)
  const rows = mazdooriLedger(records)
  assert.equal(rows[0].sale.id, '00')
  assert.equal(rows[0].mazdoori, 10.25); assert.equal(rows[0].weight, 0.3)
  assert.equal(rows.find(row => row.sale.id === '06').totalMazdoori, 71.75)
  const cancelled = rows.find(row => row.sale.id === 'cancelled')
  assert.equal(cancelled.totalMazdoori, 61.5); assert.equal(cancelled.totalWeight, 1.8)
  assert.equal(rows.slice(10)[0].totalMazdoori, 102.5)
  assert.equal(rows.at(-1).totalMazdoori, 123); assert.equal(rows.at(-1).totalWeight, 3.6)
  assert.deepEqual(records, before)
  const nextWeek = { id: 'next', createdAt: '2026-10-10T12:00:00', totalMazdoori: 50, items: [line({ quantity: 2 })] }
  const weeks = mazdooriWeeks([...records, nextWeek])
  assert.equal(mazdooriLedger(weeks[0].sales)[0].totalMazdoori, 50)
  assert.equal(mazdooriLedger(weeks[0].sales)[0].totalWeight, 2)
  assert.deepEqual(mazdooriLedger([]), [])
})

test('mazdoori workweek runs Saturday to Thursday and excludes the Friday holiday', () => {
  const { mazdooriPeriod, isInMazdooriPeriod } = source(path.join(root, 'src/features/mazdoori/period.ts'))
  for (const today of ['2026-10-03', '2026-10-08', '2026-10-09']) {
    const period = mazdooriPeriod('weekly', today)
    assert.equal(period.from, '2026-10-03'); assert.equal(period.to, '2026-10-08')
    assert.equal(isInMazdooriPeriod('2026-10-03T12:00:00', period), true)
    assert.equal(isInMazdooriPeriod('2026-10-08T23:59:59', period), true)
    assert.equal(isInMazdooriPeriod('2026-10-02T12:00:00', period), false)
    assert.equal(isInMazdooriPeriod('2026-10-09T00:00:00', period), false)
    assert.equal(isInMazdooriPeriod('2026-10-10T00:00:00', period), false)
  }
  assert.equal(mazdooriPeriod('weekly', '2026-10-10').from, '2026-10-10')
  assert.equal(mazdooriPeriod('weekly', '2026-01-01').from, '2025-12-27')
  assert.equal(mazdooriPeriod('weekly', '2026-01-01').to, '2026-01-01')
})

test('mazdoori period totals cover all matching pages, count days once and exclude cancelled bills', () => {
  const { mazdooriPeriod, isInMazdooriPeriod, mazdooriSummary } = source(path.join(root, 'src/features/mazdoori/period.ts'))
  const rows = Array.from({ length: 12 }, (_, i) => ({ createdAt: i < 6 ? '2026-10-03T12:00:00' : '2026-10-08T12:00:00', totalMazdoori: 10.25 }))
  rows.push({ createdAt: '2026-10-09T12:00:00', totalMazdoori: 500 }, { createdAt: '2026-09-30T12:00:00', totalMazdoori: 1000 })
  rows.push({ createdAt: '2026-10-08T12:00:00', totalMazdoori: 999, cancelledAt: '2026-10-08T13:00:00' })
  const summarize = preset => mazdooriSummary(rows.filter(row => isInMazdooriPeriod(row.createdAt, mazdooriPeriod(preset, '2026-10-08'))))
  assert.deepEqual(summarize('weekly'), { total: 123, bills: 12, days: 2 })
  assert.deepEqual(summarize('today'), { total: 61.5, bills: 6, days: 1 })
  assert.deepEqual(summarize('monthly'), { total: 623, bills: 13, days: 3 })
  assert.deepEqual(summarize('all'), { total: 1623, bills: 14, days: 4 })
  assert.equal(mazdooriPeriod('monthly', '2028-02-15').to, '2028-02-29')
  assert.equal(mazdooriPeriod('monthly', '2026-12-15').to, '2026-12-31')
  assert.deepEqual(mazdooriSummary([]), { total: 0, bills: 0, days: 0 })
  const custom = mazdooriPeriod('custom', '2026-10-08', '2026-10-08', '2026-10-08')
  assert.deepEqual(mazdooriSummary(rows.filter(row => isInMazdooriPeriod(row.createdAt, custom))), { total: 61.5, bills: 6, days: 1 })
})

test('mazdoori ledger only includes items with kg unit in weight, excluding qty items', () => {
  const { mazdooriLedger } = source(path.join(root, 'src/features/mazdoori/period.ts'))
  const saleWithMixedUnits = {
    id: 'sale-units',
    createdAt: '2026-10-10T12:00:00',
    totalMazdoori: 100,
    items: [
      line({ quantity: 5, unit: 'kg' }),
      line({ quantity: 10, unit: 'qty' }),
      line({ quantity: 3 }),
    ],
  }
  const rows = mazdooriLedger([saleWithMixedUnits])
  assert.equal(rows[0].weight, 8)
  assert.equal(rows[0].totalWeight, 8)
  assert.equal(rows[0].mazdoori, 100)
})
test('customer with opening balance initializes ledger and includes previous balance in first bill', async () => {
  const { saleToInvoiceData, previousInvoiceBalance, invoiceAccountTotals } = source(path.join(root, 'src/features/billing/invoice-data.ts'))
  const c = await db.createCustomer({ name: 'Opening Customer', mobile: '03001234567', openingBalance: 4500 })
  assert.equal(c.balance, 4500)
  assert.equal(c.totalPurchase, 4500)
  assert.equal(c.totalPaid, 0)

  const ledger = await db.getCustomerLedger(c.id)
  assert.equal(ledger.length, 1)
  assert.equal(ledger[0].debit, 4500)
  assert.equal(ledger[0].credit, 0)
  assert.equal(ledger[0].balance, 4500)
  assert.match(ledger[0].description, /Opening Balance/)

  validateBackup(await db.exportDatabase())

  await bill(c.id, { paidAmount: 500, items: [line({ quantity: 1, rate: 1500, mazdoori: 0, mazdooriTasks: [] })] })
  const sale = (await db.getSales())[0]
  const invoice = saleToInvoiceData(sale, await db.getCustomerById(c.id))
  invoice.previousBalance = previousInvoiceBalance(invoice, await db.getCustomerLedger(c.id))

  assert.equal(invoice.previousBalance, 4500)
  const totals = invoiceAccountTotals(invoice)
  assert.equal(totals.previousBalance, 4500)
  assert.equal(totals.total, 6000)
  assert.equal(totals.balance, 5500)

  const updatedCustomer = await db.getCustomerById(c.id)
  assert.equal(updatedCustomer.balance, 5500)
  validateBackup(await db.exportDatabase())
})
