import { invoke } from '@tauri-apps/api/core'
import type { BusinessSettings, Customer, CustomerLedgerEntry, Expense, Item, ItemFormData, Mazdoor, MazdooriEntry, Sale, SaleItem } from '@/types'
import { customerSchema, type CustomerFormData } from '@/schemas'
import type { SyncQueueRecord } from '@/types/database'
import { prepareBill } from '@/utils/billing'
import { isValidDateKey, localDateKey, roundMoney } from '@/utils/financial'
import { useUIStore } from '@/stores/ui.store'
import { useBusinessSettingsStore } from '@/stores/business-settings.store'
import { TABLES, toRow, fromRow, validateBackup, type Backup, type Row, type Tables, type TableName } from './data-model'

export interface CreateSaleInput {
  id?: string; invoiceNumber?: string; customerId?: string | null; customerName?: string | null; customerMobile?: string | null
  items: SaleItem[]; subtotal: number; discount: number; totalMazdoori: number; total: number; paidAmount: number
  remainingCredit: number; paymentMethod: string; notes?: string
}
export const DEFAULT_SETTINGS: BusinessSettings = {
  id: 'default', businessName: 'ANAS ARKI PRESS', subtitle: 'PRECISION | QUALITY | YOUR VISION OUR WORK',
  phone: '03007973059', address: 'Dhuddiwala, Lower Canal Road, Near Askari Bank, Jaranwala Road, Faisalabad, Pakistan.',
  invoicePrefix: 'ARKI', nextInvoiceNumber: 1001, receiptPaperSize: 'A4', footerText: 'Thank you for your business!',
  showLogo: true, currency: 'PKR', currencySymbol: 'Rs',
}
const STORAGE_KEY = 'arki_database_v2'
const LEGACY: Partial<Record<TableName, string>> = { customers: 'arki_customers_v1', sales: 'arki_sales_v1', mazdoors: 'arki_mazdoors_v1', mazdoori_entries: 'arki_mazdoori_entries_v1', customer_ledger: 'arki_ledger_v1', payments: 'arki_payments_v1', business_settings: 'arki_settings_v1' }
export function isTauri(): boolean { return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window }
function emptyTables(): Tables { return Object.fromEntries(TABLES.map(t => [t, []])) as unknown as Tables }
function now() { return new Date().toISOString() }
function stamp<T extends object>(value: T) { return { ...value, createdAt: now(), syncStatus: 'pending' as const } }
function assertAmount(amount: number, label = 'Amount') { if (!Number.isFinite(amount) || amount <= 0) throw new Error(label + ' must be greater than zero.') }
function found(tables: Tables, table: TableName, id: string): Row { const row = tables[table].find(r => r.id === id); if (!row) throw new Error('Record not found.'); return row }
function touch(row: Row) { row.updated_at = now(); row.sync_status = 'pending' }
function readBrowser(): Tables {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    // Databases saved before a table existed (e.g. expenses) get it as empty
    const tables = JSON.parse(saved) as Tables
    for (const table of TABLES) tables[table] ??= []
    // Keep only user-created dynamic items
    tables.items = tables.items.filter(i => !['chadar', 'dabi', 'chowkhat', 'laser-grill', 'cnc-panel', 'steel-gate'].includes(String(i.id)))
    return tables
  }
  const tables = emptyTables()
  tables.business_settings = [toRow(DEFAULT_SETTINGS)]
  tables.items = []
  for (const [table, key] of Object.entries(LEGACY)) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    const value = JSON.parse(raw)
    if (table === 'business_settings') tables.business_settings = [toRow({ ...DEFAULT_SETTINGS, ...value, id: 'default' })]
    else if (table === 'sales') for (const sale of value as Sale[]) {
      tables.sales.push(toRow({ ...sale, syncStatus: sale.syncStatus || 'pending' }))
      for (const item of sale.items || []) {
        tables.sale_items.push(toRow({ ...item, saleId: sale.id, itemId: null, unit: item.unit || 'kg', createdAt: sale.createdAt }))
        for (const task of item.mazdooriTasks || []) tables.sale_item_mazdoori_tasks.push({ id: task.id, sale_item_id: item.id, title: task.title, amount: task.amount, worker_name: task.workerName || task.mazdoorName || null, created_at: sale.createdAt })
      }
    }
    else tables[table as TableName] = (value as object[]).map(toRow)
  }
  for (const sale of tables.sales) if (Number(sale.paid_amount) > 0 && !tables.payments.some(p => p.sale_id === sale.id)) {
    tables.payments.push({ id: 'receipt-' + sale.id, sale_id: sale.id, customer_id: sale.customer_id || null, amount: sale.paid_amount ?? 0, payment_method: sale.payment_method || 'cash', payment_date: sale.created_at || now(), created_at: sale.created_at || now(), sync_status: 'pending' })
  }
  for (const entry of tables.customer_ledger) if (!entry.sale_id && Number(entry.credit) > 0 && !tables.payments.some(p => p.customer_id === entry.customer_id && p.amount === entry.credit && p.payment_date === entry.date)) {
    tables.payments.push({ id: 'receipt-' + entry.id, customer_id: entry.customer_id ?? null, sale_id: null, amount: entry.credit ?? 0, payment_method: String(entry.description).includes('BANK') ? 'bank' : 'cash', payment_date: entry.date || now(), created_at: entry.created_at || now(), sync_status: 'pending' })
  }
  persist(tables, emptyTables())
  return tables
}
function queue(tables: Tables, table: TableName, id: string, operation: string) {
  tables.sync_queue.push({ id: crypto.randomUUID(), entity_type: table, entity_id: id, operation, payload: '{}', status: 'pending', retry_count: 0, last_error: null, created_at: now(), updated_at: now() })
}
function persist(tables: Tables, before: Tables) {
  for (const table of TABLES.filter(t => t !== 'sync_queue')) {
    for (const row of tables[table]) if (!before[table].some(old => old.id === row.id && JSON.stringify(old) === JSON.stringify(row))) queue(tables, table, String(row.id), 'UPDATE')
    for (const row of before[table]) if (!tables[table].some(next => next.id === row.id)) queue(tables, table, String(row.id), 'DELETE')
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tables))
  useUIStore.getState().setSyncStatus('pending')
}
function transaction<T>(action: (tables: Tables) => T): T {
  const before = readBrowser(); const tables = structuredClone(before); const result = action(tables); persist(tables, before); return result
}
export async function initDatabase(): Promise<boolean> { if (isTauri()) return invoke('init_database'); readBrowser(); return true }
export async function exportDatabase(): Promise<Backup> {
  if (isTauri()) return invoke('export_database')
  return { format: 'arki-pos', version: 2, exportedAt: now(), tables: structuredClone(readBrowser()) }
}
export async function restoreDatabase(input: unknown): Promise<boolean> {
  const backup = validateBackup(input)
  localStorage.setItem('arki_sync_paused', 'true')
  if (isTauri()) return invoke('restore_database', { backup })
  localStorage.setItem('arki_pre_restore_v2', JSON.stringify({ format: 'arki-pos', version: 2, exportedAt: now(), tables: readBrowser() }))
  const tables = structuredClone(backup.tables)
  tables.sync_queue = []
  for (const table of TABLES.filter(t => t !== 'sync_queue')) for (const row of tables[table]) queue(tables, table, String(row.id), 'UPDATE')
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tables))
  useUIStore.getState().setSyncStatus('pending')
  return true
}
export async function getCustomers(): Promise<Customer[]> { if (isTauri()) return invoke('get_customers'); return readBrowser().customers.map(fromRow<Customer>) }
export async function getCustomerById(id: string): Promise<Customer | null> { if (isTauri()) return invoke('get_customer_by_id', { customerId: id }); return (await getCustomers()).find(c => c.id === id) || null }
export async function createCustomer(input: CustomerFormData): Promise<Customer> {
  const data = customerSchema.parse(input)
  const opening = roundMoney(Number(data.openingBalance) || 0)
  const customer = stamp({ ...data, updatedAt: now(), id: crypto.randomUUID(), totalPurchase: opening, totalPaid: 0, balance: opening }) as Customer
  if (isTauri()) return invoke('create_customer', { customer })
  return transaction(t => {
    t.customers.push(toRow(customer))
    if (opening > 0) {
      t.customer_ledger.push(toRow(stamp({
        id: crypto.randomUUID(),
        customerId: customer.id,
        date: customer.createdAt,
        description: 'Opening Balance (Previous Udhar)',
        debit: opening,
        credit: 0,
        balance: opening,
      })))
    }
    return customer
  })
}
export async function updateCustomer(customer: Customer): Promise<Customer> {
  const data = customerSchema.parse(customer)
  if (isTauri()) return invoke('update_customer', { customer: { ...customer, ...data } })
  return transaction(t => { const row = found(t, 'customers', customer.id); Object.assign(row, toRow(data)); touch(row); return fromRow<Customer>(row) })
}
export async function deleteCustomer(id: string): Promise<boolean> {
  if (isTauri()) return invoke('delete_customer', { customerId: id })
  return transaction(t => { found(t, 'customers', id); if (t.sales.some(r => r.customer_id === id) || t.payments.some(r => r.customer_id === id) || t.customer_ledger.some(r => r.customer_id === id)) throw new Error('Customers with financial history cannot be deleted.'); t.customers = t.customers.filter(r => r.id !== id); return true })
}
export async function getCustomerLedger(customerId: string): Promise<CustomerLedgerEntry[]> {
  if (isTauri()) return invoke('get_customer_ledger', { customerId })
  return readBrowser().customer_ledger.filter(r => r.customer_id === customerId).map(fromRow<CustomerLedgerEntry>)
}
export interface ReceivePaymentInput {
  customerId?: string | null
  saleId?: string | null
  amount: number
  paymentMethod: string
  notes?: string
}

export async function receivePayment(payment: ReceivePaymentInput): Promise<string> {
  payment = { ...payment, amount: roundMoney(payment.amount) }
  assertAmount(payment.amount, 'Payment')
  if (!['cash', 'bank'].includes(payment.paymentMethod)) throw new Error('Choose cash or bank.')
  if (isTauri()) return invoke('receive_payment', { payment })
  return transaction(t => {
    let customerId = payment.customerId || null
    if (payment.saleId) {
      const sale = t.sales.find(s => s.id === payment.saleId)
      if (!sale) throw new Error('Bill not found.')
      if (payment.amount > Number(sale.remaining_credit) + 0.01) {
        throw new Error('Payment cannot exceed bill remaining credit.')
      }
      sale.paid_amount = roundMoney(Number(sale.paid_amount) + payment.amount)
      sale.remaining_credit = roundMoney(Math.max(0, Number(sale.remaining_credit) - payment.amount))
      touch(sale)
      if (!customerId && sale.customer_id) customerId = String(sale.customer_id)
    }
    let balance = 0
    if (customerId) {
      const customer = t.customers.find(c => c.id === customerId)
      if (customer) {
        if (!payment.saleId && payment.amount > Number(customer.balance)) throw new Error('Payment cannot exceed the outstanding balance.')
        customer.total_paid = roundMoney(Number(customer.total_paid) + payment.amount)
        customer.balance = roundMoney(Number(customer.balance) - payment.amount)
        touch(customer)
        balance = customer.balance
      }
    }
    const receipt = stamp({ id: crypto.randomUUID(), ...payment, customerId, saleId: payment.saleId || null, paymentDate: now() })
    t.payments.push(toRow(receipt))
    if (customerId) {
      t.customer_ledger.push(toRow(stamp({ id: crypto.randomUUID(), customerId, date: receipt.createdAt, description: 'Payment Received (' + payment.paymentMethod.toUpperCase() + ')' + (payment.notes ? ' - ' + payment.notes : ''), debit: 0, credit: payment.amount, balance })))
    }
    return receipt.id
  })
}
export async function createSale(input: CreateSaleInput): Promise<string> {
  const bill = prepareBill(input.items, input.discount, input.paidAmount)
  if (!['cash', 'bank'].includes(input.paymentMethod)) throw new Error('Choose cash or bank.')
  if (bill.remainingCredit > 0 && !input.customerId) throw new Error('Select a customer for a credit bill, or pay the full amount.')
  if (isTauri()) return invoke('create_sale', { sale: { ...input, ...bill } })
  return transaction(t => createSaleInTables(t, input))
}

function createSaleInTables(t: Tables, input: CreateSaleInput): string {
    const bill = prepareBill(input.items, input.discount, input.paidAmount)
    if (!['cash', 'bank'].includes(input.paymentMethod)) throw new Error('Choose cash or bank.')
    if (bill.remainingCredit > 0 && !input.customerId) throw new Error('Select a customer for an unpaid bill, or enter the full payment.')
    const settings = t.business_settings[0]!
    let sequence = Number(settings.next_invoice_number)
    let invoiceNumber = input.invoiceNumber || String(settings.invoice_prefix) + '-' + String(sequence).padStart(4, '0')
    while (!input.invoiceNumber && t.sales.some(s => s.invoice_number === invoiceNumber)) invoiceNumber = String(settings.invoice_prefix) + '-' + String(++sequence).padStart(4, '0')
    if (t.sales.some(s => s.invoice_number === invoiceNumber)) throw new Error('Invoice number already exists.')
    settings.next_invoice_number = sequence + 1
    if (input.id && t.sales.some(s => s.id === input.id)) throw new Error('Bill already exists.')
    const sale = stamp({ ...input, ...bill, invoiceNumber, id: input.id || crypto.randomUUID() })
    t.sales.push(toRow(sale))
    for (const item of bill.items) {
      const itemId = crypto.randomUUID(); t.sale_items.push(toRow({ ...item, id: itemId, saleId: sale.id, itemId: null, unit: item.unit || 'kg', createdAt: sale.createdAt }))
      for (const task of item.mazdooriTasks || []) {
        t.sale_item_mazdoori_tasks.push({ id: crypto.randomUUID(), sale_item_id: itemId, title: task.title, amount: task.amount, worker_name: task.workerName || null, created_at: sale.createdAt })
        if (!task.workerName) continue
        let worker = t.mazdoors.find(w => String(w.name).toLowerCase() === task.workerName!.toLowerCase())
        if (!worker) { worker = toRow(stamp({ id: crypto.randomUUID(), name: task.workerName, phone: '', totalWork: 0, totalPaid: 0, balance: 0 })); t.mazdoors.push(worker) }
        worker.total_work = roundMoney(Number(worker.total_work) + task.amount); worker.balance = roundMoney(Number(worker.balance) + task.amount); touch(worker)
        t.mazdoori_entries.push(toRow(stamp({ id: crypto.randomUUID(), mazdoorId: worker.id, mazdoorName: worker.name, workDate: localDateKey(), workDetail: task.title + ' (Invoice #' + invoiceNumber + ')', amount: task.amount, paidAmount: 0, balance: worker.balance, notes: 'Auto-posted from sale ' + sale.id })))
      }
    }
    if (bill.paidAmount > 0) t.payments.push(toRow(stamp({ id: crypto.randomUUID(), customerId: input.customerId || null, saleId: sale.id, amount: bill.paidAmount, paymentMethod: input.paymentMethod, paymentDate: sale.createdAt, notes: 'Payment for invoice ' + invoiceNumber })))
    if (input.customerId) {
      const customer = found(t, 'customers', input.customerId)
      customer.total_purchase = roundMoney(Number(customer.total_purchase) + bill.total); customer.total_paid = roundMoney(Number(customer.total_paid) + bill.paidAmount); customer.balance = roundMoney(Number(customer.balance) + bill.remainingCredit); touch(customer)
      t.customer_ledger.push(toRow(stamp({ id: crypto.randomUUID(), customerId: input.customerId, saleId: sale.id, date: sale.createdAt, description: 'Invoice #' + invoiceNumber, debit: bill.total, credit: bill.paidAmount, balance: customer.balance })))
    }
    return invoiceNumber
}
// Cancel keeps the invoice for history and posts reversals: the customer's
// purchase, at-sale payment (refunded) and credit come off, and labour
// auto-posted to workers is voided.
export async function cancelSale(saleId: string, reason = ''): Promise<boolean> {
  reason = reason.trim()
  if (isTauri()) return invoke('cancel_sale', { saleId, reason: reason || null })
  return transaction(t => cancelSaleInTables(t, saleId, reason))
}

function cancelSaleInTables(t: Tables, saleId: string, reason: string): boolean {
    const sale = found(t, 'sales', saleId)
    if (sale.cancelled_at) throw new Error('Invoice is already cancelled.')
    const cancelledAt = now()
    sale.cancelled_at = cancelledAt; sale.cancel_reason = reason || null; touch(sale)
    const total = Number(sale.total), paid = Number(sale.paid_amount), credit = Number(sale.remaining_credit)
    if (sale.customer_id) {
      const customer = found(t, 'customers', String(sale.customer_id))
      customer.total_purchase = roundMoney(Number(customer.total_purchase) - total); customer.total_paid = roundMoney(Number(customer.total_paid) - paid); customer.balance = roundMoney(Number(customer.balance) - credit); touch(customer)
      // Mirror of the invoice's ledger row: the bill comes off, the amount paid at sale is refunded
      t.customer_ledger.push(toRow(stamp({ id: crypto.randomUUID(), customerId: customer.id, saleId: sale.id, date: cancelledAt, description: 'Invoice #' + sale.invoice_number + ' cancelled' + (reason ? ' - ' + reason : ''), debit: paid, credit: total, balance: customer.balance })))
    }
    for (const entry of t.mazdoori_entries.filter(e => e.notes === 'Auto-posted from sale ' + sale.id || e.notes === 'Auto-posted from sale ' + sale.invoice_number)) {
      if (t.mazdoori_entries.some(e => e.notes === 'Void:' + entry.id)) continue
      const worker = found(t, 'mazdoors', String(entry.mazdoor_id)), amount = Number(entry.amount)
      worker.total_work = roundMoney(Number(worker.total_work) - amount); worker.balance = roundMoney(Number(worker.balance) - amount); touch(worker)
      t.mazdoori_entries.push(toRow(stamp({ id: crypto.randomUUID(), mazdoorId: worker.id, mazdoorName: worker.name, workDate: localDateKey(), workDetail: 'Voided: ' + entry.work_detail + ' (invoice cancelled)', amount: -amount, paidAmount: 0, balance: worker.balance, notes: 'Void:' + entry.id })))
    }
    return true
}

// Update bill in-place without creating a replacement bill or extra insertion
export async function updateSale(saleId: string, input: CreateSaleInput): Promise<string> {
  const bill = prepareBill(input.items, input.discount, input.paidAmount)
  if (isTauri()) return invoke('update_sale', { saleId, sale: { ...input, ...bill } })
  return transaction(t => {
    const sale = found(t, 'sales', saleId)
    if (sale.cancelled_at) throw new Error('A cancelled bill cannot be edited. Start a new bill.')
    if ((sale.customer_id || null) !== (input.customerId || null)) throw new Error('The customer cannot be changed on a saved bill.')
    if (!['cash', 'bank'].includes(input.paymentMethod)) throw new Error('Choose cash or bank.')
    if (bill.remainingCredit > 0 && !input.customerId) throw new Error('Select a customer for an unpaid bill, or enter the full payment.')
    const oldTotal = Number(sale.total), oldPaid = Number(sale.paid_amount), oldCredit = Number(sale.remaining_credit)
    const initialReceipt = t.payments.find(p => p.sale_id === saleId && (p.notes === 'Payment for invoice ' + sale.invoice_number || p.id === 'receipt-' + saleId))
    const laterPaid = roundMoney(t.payments.filter(p => p.sale_id === saleId && p.id !== initialReceipt?.id).reduce((sum, p) => sum + Number(p.amount), 0))
    if (bill.paidAmount < laterPaid) throw new Error('Later payments are already recorded for this bill. Payment Received cannot be less than those payments.')
    const correctedInitialPaid = roundMoney(bill.paidAmount - laterPaid)
    const ledgerRow = t.customer_ledger.find(row => row.sale_id === saleId && row.description === 'Invoice #' + sale.invoice_number)
    const oldInitialPaid = ledgerRow ? Number(ledgerRow.credit) : initialReceipt ? Number(initialReceipt.amount) : roundMoney(oldPaid - laterPaid)
    if (input.customerId) {
      const account = found(t, 'customers', input.customerId)
      account.total_purchase = roundMoney(Number(account.total_purchase) + bill.total - oldTotal)
      account.total_paid = roundMoney(Number(account.total_paid) + bill.paidAmount - oldPaid)
      account.balance = roundMoney(Number(account.balance) + bill.remainingCredit - oldCredit)
      touch(account)
      if (!ledgerRow) throw new Error('This bill is missing its customer ledger entry. Restore the record before editing.')
      const customerRows = t.customer_ledger.filter(row => row.customer_id === input.customerId)
      const position = customerRows.indexOf(ledgerRow)
      const delta = roundMoney(bill.total - oldTotal - (correctedInitialPaid - oldInitialPaid))
      ledgerRow.debit = bill.total
      ledgerRow.credit = correctedInitialPaid
      for (const row of customerRows.slice(position)) { row.balance = roundMoney(Number(row.balance) + delta); touch(row) }
    }
    sale.customer_id = input.customerId || null
    sale.customer_name = input.customerName || null
    sale.customer_mobile = input.customerMobile || null
    sale.subtotal = bill.subtotal
    sale.discount = bill.discount
    sale.total_mazdoori = bill.totalMazdoori
    sale.total = bill.total
    sale.paid_amount = bill.paidAmount
    sale.remaining_credit = bill.remainingCredit
    sale.payment_method = input.paymentMethod
    sale.notes = input.notes || null
    sale.cancelled_at = null
    sale.cancel_reason = null
    touch(sale)

    const oldItems = t.sale_items.filter(i => i.sale_id === saleId)
    const oldItemIds = new Set(oldItems.map(item => item.id))
    t.sale_item_mazdoori_tasks = t.sale_item_mazdoori_tasks.filter(task => !oldItemIds.has(task.sale_item_id))
    t.sale_items = t.sale_items.filter(i => i.sale_id !== saleId)
    for (const item of bill.items) {
      const itemId = oldItemIds.has(item.id) ? item.id : crypto.randomUUID()
      t.sale_items.push(toRow(stamp({
        id: itemId,
        saleId,
        itemId: item.itemId || null,
        itemName: item.itemName,
        quantity: item.quantity,
        rate: item.rate,
        mazdoori: item.mazdoori,
        amount: item.amount,
        unit: item.unit || 'kg',
      })))
      for (const task of item.mazdooriTasks || []) t.sale_item_mazdoori_tasks.push({ id: task.id || crypto.randomUUID(), sale_item_id: itemId, title: task.title, amount: task.amount, worker_name: task.workerName || null, created_at: sale.created_at })
    }

    const payment = initialReceipt
    if (correctedInitialPaid > 0) {
      if (payment) {
        payment.amount = correctedInitialPaid
        payment.payment_method = input.paymentMethod
        touch(payment)
      } else {
        t.payments.push(toRow(stamp({
          id: crypto.randomUUID(),
          customerId: input.customerId || null,
          saleId,
          amount: correctedInitialPaid,
          paymentMethod: input.paymentMethod,
          paymentDate: sale.created_at,
          notes: 'Payment for invoice ' + sale.invoice_number,
        })))
      }
    } else if (payment) {
      t.payments = t.payments.filter(p => p.id !== payment.id)
    }

    return String(sale.invoice_number)
  })
}
export interface ExpenseInput { expenseDate: string; category: string; description?: string; amount: number; paymentMethod: string }
export async function getExpenses(): Promise<Expense[]> {
  if (isTauri()) return invoke('get_expenses')
  return readBrowser().expenses.map(fromRow<Expense>).sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || b.createdAt.localeCompare(a.createdAt))
}
export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const amount = roundMoney(input.amount); assertAmount(amount, 'Expense')
  if (!input.category.trim()) throw new Error('Choose an expense category.')
  if (!isValidDateKey(input.expenseDate)) throw new Error('Enter a valid expense date.')
  if (!['cash', 'bank'].includes(input.paymentMethod)) throw new Error('Choose cash or bank.')
  const expense = stamp({ id: crypto.randomUUID(), expenseDate: input.expenseDate, category: input.category.trim(), description: input.description?.trim() || null, amount, paymentMethod: input.paymentMethod }) as Expense
  if (isTauri()) return invoke('create_expense', { expense })
  return transaction(t => { t.expenses.push(toRow({ ...expense, updatedAt: expense.createdAt })); return expense })
}
export async function deleteExpense(id: string): Promise<boolean> {
  if (isTauri()) return invoke('delete_expense', { expenseId: id })
  return transaction(t => { found(t, 'expenses', id); t.expenses = t.expenses.filter(r => r.id !== id); return true })
}
export async function getItems(): Promise<Item[]> {
  if (isTauri()) return invoke('get_items')
  return readBrowser().items.map(fromRow<Item>)
}
export async function createItem(input: ItemFormData): Promise<Item> {
  if (!input.name.trim()) throw new Error('Product name is required.')
  const item: Item = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    urduName: input.urduName?.trim() || null,
    category: input.category?.trim() || null,
    defaultRate: roundMoney(Number(input.defaultRate) || 0),
    isActive: input.isActive ?? true,
    createdAt: now(),
    updatedAt: now(),
  }
  if (isTauri()) return invoke('create_item', { item })
  return transaction(t => { t.items.push(toRow(item)); return item })
}
export async function updateItem(item: Item): Promise<Item> {
  if (!item.name.trim()) throw new Error('Product name is required.')
  const cleanItem: Item = {
    ...item,
    name: item.name.trim(),
    urduName: item.urduName?.trim() || null,
    category: item.category?.trim() || null,
    defaultRate: roundMoney(Number(item.defaultRate) || 0),
    isActive: item.isActive ?? true,
    updatedAt: now(),
  }
  if (isTauri()) return invoke('update_item', { item: cleanItem })
  return transaction(t => {
    const row = found(t, 'items', item.id)
    Object.assign(row, toRow(cleanItem))
    touch(row)
    return fromRow<Item>(row)
  })
}
export async function deleteItem(id: string): Promise<boolean> {
  if (isTauri()) return invoke('delete_item', { itemId: id })
  return transaction(t => {
    found(t, 'items', id)
    t.items = t.items.filter(r => r.id !== id)
    return true
  })
}
export async function getMazdoors(): Promise<Mazdoor[]> { if (isTauri()) return invoke('get_mazdoors'); return readBrowser().mazdoors.map(fromRow<Mazdoor>) }
export async function createMazdoor(data: { name: string; phone?: string }): Promise<Mazdoor> {
  if (data.name.trim().length < 2) throw new Error('Worker name must contain at least two characters.')
  const mazdoor = stamp({ ...data, updatedAt: now(), name: data.name.trim(), id: crypto.randomUUID(), totalWork: 0, totalPaid: 0, balance: 0 }) as Mazdoor
  if (isTauri()) return invoke('create_mazdoor', { mazdoor })
  return transaction(t => { t.mazdoors.push(toRow(mazdoor)); return mazdoor })
}
export async function updateMazdoor(mazdoor: Mazdoor): Promise<Mazdoor> {
  if (mazdoor.name.trim().length < 2) throw new Error('Enter the worker name.')
  if (isTauri()) return invoke('update_mazdoor', { mazdoor })
  return transaction(t => { const row = found(t, 'mazdoors', mazdoor.id); row.name = mazdoor.name.trim(); row.phone = mazdoor.phone || ''; touch(row); return fromRow<Mazdoor>(row) })
}
export async function deleteMazdoor(id: string): Promise<boolean> {
  if (isTauri()) return invoke('delete_mazdoor', { mazdoorId: id })
  return transaction(t => { found(t, 'mazdoors', id); if (t.mazdoori_entries.some(e => e.mazdoor_id === id)) throw new Error('Workers with financial history cannot be deleted.'); t.mazdoors = t.mazdoors.filter(r => r.id !== id); return true })
}
export async function getMazdooriEntries(mazdoorId?: string): Promise<MazdooriEntry[]> {
  if (isTauri()) return invoke('get_mazdoori_entries', { mazdoorId: mazdoorId || null })
  return readBrowser().mazdoori_entries.filter(r => !mazdoorId || r.mazdoor_id === mazdoorId).map(fromRow<MazdooriEntry>).reverse()
}
export async function createMazdooriEntry(entry: { mazdoorId: string; mazdoorName: string; workDate: string; workDetail: string; amount: number; paidAmount: number; notes?: string }): Promise<MazdooriEntry> {
  entry = { ...entry, amount: roundMoney(entry.amount), paidAmount: roundMoney(entry.paidAmount) }; assertAmount(entry.amount); if (!Number.isFinite(entry.paidAmount) || entry.paidAmount < 0 || entry.paidAmount > entry.amount) throw new Error('Advance cannot exceed the labor amount.')
  if (!entry.workDetail.trim() || !isValidDateKey(entry.workDate)) throw new Error('Enter work details and a valid date.')
  const newEntry = stamp({ ...entry, id: crypto.randomUUID(), balance: entry.amount - entry.paidAmount })
  if (isTauri()) return invoke('create_mazdoori_entry', { entry: newEntry })
  return transaction(t => {
    const worker = found(t, 'mazdoors', entry.mazdoorId); worker.total_work = roundMoney(Number(worker.total_work) + entry.amount); worker.total_paid = roundMoney(Number(worker.total_paid) + entry.paidAmount); worker.balance = roundMoney(Number(worker.balance) + entry.amount - entry.paidAmount); touch(worker)
    const saved = { ...newEntry, mazdoorName: String(worker.name), balance: Number(worker.balance) }; t.mazdoori_entries.push(toRow(saved)); return saved
  })
}
export async function deleteMazdooriEntry(id: string): Promise<boolean> {
  if (isTauri()) return invoke('delete_mazdoori_entry', { entryId: id })
  return transaction(t => {
    const entry = found(t, 'mazdoori_entries', id)
    if (String(entry.notes || '').startsWith('Auto-posted') || String(entry.notes || '').startsWith('Void:') || t.mazdoori_entries.some(r => r.notes === 'Void:' + id)) throw new Error('Invoice-linked or already voided entries cannot be voided.')
    const worker = found(t, 'mazdoors', String(entry.mazdoor_id))
    worker.total_work = roundMoney(Number(worker.total_work) - Number(entry.amount)); worker.total_paid = roundMoney(Number(worker.total_paid) - Number(entry.paid_amount)); worker.balance = roundMoney(Number(worker.balance) - Number(entry.amount) + Number(entry.paid_amount)); touch(worker)
    t.mazdoori_entries.push(toRow(stamp({ id: crypto.randomUUID(), mazdoorId: worker.id, mazdoorName: worker.name, workDate: localDateKey(), workDetail: 'Voided: ' + entry.work_detail, amount: -Number(entry.amount), paidAmount: -Number(entry.paid_amount), balance: worker.balance, notes: 'Void:' + id })))
    return true
  })
}
export async function payMazdoor(payment: { mazdoorId: string; amount: number; notes?: string }): Promise<boolean> {
  payment = { ...payment, amount: roundMoney(payment.amount) }; assertAmount(payment.amount, 'Payout')
  if (isTauri()) return invoke('pay_mazdoor', { payment })
  return transaction(t => {
    const worker = found(t, 'mazdoors', payment.mazdoorId); worker.total_paid = roundMoney(Number(worker.total_paid) + payment.amount); worker.balance = roundMoney(Number(worker.balance) - payment.amount); touch(worker)
    t.mazdoori_entries.push(toRow(stamp({ id: crypto.randomUUID(), mazdoorId: worker.id, mazdoorName: worker.name, workDate: localDateKey(), workDetail: 'Payment Received / Payout', amount: 0, paidAmount: payment.amount, balance: worker.balance, notes: payment.notes || 'Payout to worker' }))); return true
  })
}
export async function getSales(limit = -1): Promise<Sale[]> {
  if (isTauri()) return invoke('get_sales', { limit })
  const t = readBrowser()
  const sales = t.sales.map(r => ({ ...fromRow<Sale>(r), items: t.sale_items.filter(i => i.sale_id === r.id).map(i => ({ ...fromRow<SaleItem>(i), unit: (i.unit as 'kg' | 'qty') || 'kg', mazdooriTasks: t.sale_item_mazdoori_tasks.filter(task => task.sale_item_id === i.id).map(task => fromRow<NonNullable<SaleItem['mazdooriTasks']>[number]>(task)) })) })).reverse()
  return limit < 0 ? sales : sales.slice(0, limit)
}
export interface Receipt { id: string; amount: number; paymentDate: string; customerId?: string; saleId?: string; paymentMethod: string }
export async function getPayments(): Promise<Receipt[]> { return (await exportDatabase()).tables.payments.map(fromRow<Receipt>) }
export async function getBusinessSettings(): Promise<BusinessSettings> {
  const raw = isTauri() ? await invoke<BusinessSettings>('get_business_settings') : fromRow<BusinessSettings>(readBrowser().business_settings[0]!)
  const settings: BusinessSettings = {
    ...raw,
    businessName: raw.businessName?.replace(/\s*&\s*LASER\s*CUTTING/i, '').trim() || DEFAULT_SETTINGS.businessName,
    phone: (raw.phone && raw.phone !== '0300-7973059') ? raw.phone : DEFAULT_SETTINGS.phone,
    address: (raw.address && !raw.address.toLowerCase().includes('dhuddi wala')) ? raw.address : DEFAULT_SETTINGS.address,
  }
  useBusinessSettingsStore.getState().setSettings(settings)
  return settings
}
export async function updateBusinessSettings(settings: BusinessSettings): Promise<BusinessSettings> {
  if (!['A4', '80mm', '58mm'].includes(settings.receiptPaperSize) || !settings.businessName.trim() || !settings.invoicePrefix.trim() || !Number.isSafeInteger(settings.nextInvoiceNumber) || settings.nextInvoiceNumber < 1) throw new Error('Enter shop name, invoice prefix and a positive invoice sequence.')
  const updated = isTauri() ? await invoke<BusinessSettings>('update_business_settings', { settings }) : transaction(t => { t.business_settings = [toRow({ ...settings, id: 'default' })]; return settings })
  useBusinessSettingsStore.getState().setSettings(updated)
  return updated
}
export async function getSyncQueue(limit = -1): Promise<SyncQueueRecord[]> {
  if (isTauri()) return invoke('get_sync_queue', { limit })
  const rows = readBrowser().sync_queue.filter(r => r.status !== 'synced')
  return (limit < 0 ? rows : rows.slice(0, limit)).map(r => ({ ...fromRow<SyncQueueRecord>(r), payload: JSON.parse(String(r.payload)) }))
}
export async function updateSyncStatus(queueId: string, status: 'pending' | 'syncing' | 'synced' | 'failed', lastError?: string): Promise<boolean> {
  if (isTauri()) return invoke('update_sync_status', { queueId, status, lastError: lastError || null })
  const tables = readBrowser(); const row = tables.sync_queue.find(r => r.id === queueId)
  if (row) {
    row.status = status; row.last_error = lastError || null; row.updated_at = now()
    if (status === 'failed') row.retry_count = Number(row.retry_count) + 1
    const table = row.entity_type as TableName
    if (status === 'synced' && TABLES.includes(table) && !tables.sync_queue.some(q => q.entity_type === table && q.entity_id === row.entity_id && q.status !== 'synced')) {
      const entity = tables[table].find(r => r.id === row.entity_id)
      if (entity && 'sync_status' in entity) entity.sync_status = 'synced'
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables))
  }
  return true
}
