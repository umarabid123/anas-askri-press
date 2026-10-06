import { invoke } from '@tauri-apps/api/core'
import type {
  BusinessSettings,
  Customer,
  CustomerLedgerEntry,
  Mazdoor,
  MazdooriEntry,
  Sale,
  SaleItem,
} from '@/types'
import type { CustomerFormData } from '@/schemas'
import type { SyncQueueRecord } from '@/types/database'

export interface CreateSaleInput {
  id?: string
  invoiceNumber?: string
  customerId?: string | null
  customerName?: string | null
  customerMobile?: string | null
  items: SaleItem[]
  subtotal: number
  discount: number
  totalMazdoori: number
  total: number
  paidAmount: number
  remainingCredit: number
  paymentMethod: string
  notes?: string
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

// ----------------------------------------------------------------------------
// Local Storage Mock fallback for standalone Web/Vite environments
// ----------------------------------------------------------------------------
const STORAGE_KEYS = {
  CUSTOMERS: 'arki_customers_v1',
  SALES: 'arki_sales_v1',
  SYNC_QUEUE: 'arki_sync_queue_v1',
  LEDGER: 'arki_ledger_v1',
  PAYMENTS: 'arki_payments_v1',
  MAZDOORS: 'arki_mazdoors_v1',
  MAZDOORI_ENTRIES: 'arki_mazdoori_entries_v1',
  SETTINGS: 'arki_settings_v1',
}

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('LocalStorage error:', err)
  }
}

// ----------------------------------------------------------------------------
// SQLite Service APIs
// ----------------------------------------------------------------------------

export async function initDatabase(): Promise<boolean> {
  if (isTauri()) {
    return invoke<boolean>('init_database')
  }
  return true
}

export async function getCustomers(): Promise<Customer[]> {
  if (isTauri()) {
    return invoke<Customer[]>('get_customers')
  }
  return getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, [
    {
      id: '1',
      name: 'Haji Aslam Iron Store',
      mobile: '0300-1234567',
      address: 'Shop # 12, Loha Market',
      totalPurchase: 145000,
      totalPaid: 100000,
      balance: 45000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    },
    {
      id: '2',
      name: 'Tariq Fabricators',
      mobile: '0321-9876543',
      address: 'Plot 4, Industrial Area',
      totalPurchase: 88500,
      totalPaid: 88500,
      balance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    },
  ])
}

export async function createCustomer(formData: CustomerFormData): Promise<Customer> {
  const newCustomer: Customer = {
    id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: formData.name,
    mobile: formData.mobile,
    address: formData.address || '',
    totalPurchase: 0,
    totalPaid: 0,
    balance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  }

  if (isTauri()) {
    return invoke<Customer>('create_customer', { customer: newCustomer })
  }

  // Web fallback
  const existing = await getCustomers()
  const updated = [newCustomer, ...existing]
  setStored(STORAGE_KEYS.CUSTOMERS, updated)

  // Enqueue sync record
  await enqueueSyncRecord({
    id: `sq-${Date.now()}`,
    entityType: 'customer',
    entityId: newCustomer.id,
    operation: 'INSERT',
    payload: newCustomer as unknown as Record<string, unknown>,
    status: 'pending',
    retryCount: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return newCustomer
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  if (isTauri()) {
    return invoke<Customer | null>('get_customer_by_id', { customerId: id })
  }
  const customers = await getCustomers()
  return customers.find((c) => c.id === id) || null
}

export async function updateCustomer(customer: Customer): Promise<Customer> {
  if (isTauri()) {
    return invoke<Customer>('update_customer', { customer })
  }

  const customers = await getCustomers()
  const index = customers.findIndex((c) => c.id === customer.id)
  if (index !== -1) {
    customers[index] = { ...customer, updatedAt: new Date().toISOString() }
    setStored(STORAGE_KEYS.CUSTOMERS, customers)
  }
  return customer
}

export async function deleteCustomer(id: string): Promise<boolean> {
  if (isTauri()) {
    return invoke<boolean>('delete_customer', { customerId: id })
  }

  const customers = await getCustomers()
  const filtered = customers.filter((c) => c.id !== id)
  setStored(STORAGE_KEYS.CUSTOMERS, filtered)
  return true
}

export async function getCustomerLedger(customerId: string): Promise<CustomerLedgerEntry[]> {
  if (isTauri()) {
    return invoke<CustomerLedgerEntry[]>('get_customer_ledger', { customerId })
  }

  const allLedgers = getStored<CustomerLedgerEntry[]>(STORAGE_KEYS.LEDGER, [])
  return allLedgers.filter((l) => l.customerId === customerId)
}

export async function receivePayment(payment: {
  customerId: string
  amount: number
  paymentMethod: string
  notes?: string
}): Promise<string> {
  if (isTauri()) {
    return invoke<string>('receive_payment', { payment })
  }

  const paymentId = `pay-${Date.now()}`
  const customers = await getCustomers()
  const customer = customers.find((c) => c.id === payment.customerId)
  if (customer) {
    customer.totalPaid += payment.amount
    customer.balance -= payment.amount
    customer.updatedAt = new Date().toISOString()
    setStored(STORAGE_KEYS.CUSTOMERS, customers)

    const allLedgers = getStored<CustomerLedgerEntry[]>(STORAGE_KEYS.LEDGER, [])
    allLedgers.push({
      id: `ledg-${Date.now()}`,
      customerId: customer.id,
      date: new Date().toISOString(),
      description: payment.notes
        ? `Payment Received (${payment.paymentMethod.toUpperCase()}) - ${payment.notes}`
        : `Payment Received (${payment.paymentMethod.toUpperCase()})`,
      debit: 0,
      credit: payment.amount,
      balance: customer.balance,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending',
    })
    setStored(STORAGE_KEYS.LEDGER, allLedgers)
  }

  return paymentId
}

export async function createSale(saleInput: CreateSaleInput): Promise<string> {
  if (isTauri()) {
    return invoke<string>('create_sale', { sale: saleInput })
  }

  // Web fallback: generate invoice number & simulate atomic transaction
  const invoiceNumber = saleInput.invoiceNumber || `ARKI-${1000 + Math.floor(Math.random() * 9000)}`
  const saleId = saleInput.id || `sale-${Date.now()}`

  // Update customer balance if customer linked
  if (saleInput.customerId) {
    const customers = await getCustomers()
    const target = customers.find((c) => c.id === saleInput.customerId)
    if (target) {
      target.totalPurchase += saleInput.total
      target.totalPaid += saleInput.paidAmount
      target.balance += saleInput.remainingCredit
      target.updatedAt = new Date().toISOString()
      target.syncStatus = 'pending'
      setStored(STORAGE_KEYS.CUSTOMERS, customers)

      const allLedgers = getStored<CustomerLedgerEntry[]>(STORAGE_KEYS.LEDGER, [])
      allLedgers.push({
        id: `ledg-${Date.now()}`,
        customerId: target.id,
        date: new Date().toISOString(),
        description: `Invoice #${invoiceNumber}`,
        debit: saleInput.total,
        credit: saleInput.paidAmount,
        balance: target.balance,
        saleId: saleId,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
      })
      setStored(STORAGE_KEYS.LEDGER, allLedgers)
    }
  }

  // Auto-post mazdoori labor tasks to workers & entries
  const workers = getStored<Mazdoor[]>(STORAGE_KEYS.MAZDOORS, [])
  const entries = getStored<MazdooriEntry[]>(STORAGE_KEYS.MAZDOORI_ENTRIES, [])
  const todayStr = new Date().toISOString().split('T')[0]

  if (saleInput.items && Array.isArray(saleInput.items)) {
    for (const item of saleInput.items) {
      if (item.mazdooriTasks && item.mazdooriTasks.length > 0) {
        for (const task of item.mazdooriTasks) {
          if (!task.amount || task.amount <= 0) continue
          const workerName = (task.workerName || '').trim()
          if (!workerName) continue

          let targetWorker = workers.find((w) => w.name.toLowerCase() === workerName.toLowerCase())
          if (!targetWorker) {
            targetWorker = {
              id: `w-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: workerName,
              totalWork: 0,
              totalPaid: 0,
              balance: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              syncStatus: 'pending',
            }
            workers.push(targetWorker)
          }

          targetWorker.totalWork = (targetWorker.totalWork || 0) + task.amount
          targetWorker.balance = (targetWorker.balance || 0) + task.amount
          targetWorker.updatedAt = new Date().toISOString()
          targetWorker.syncStatus = 'pending'

          entries.unshift({
            id: `me-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            mazdoorId: targetWorker.id,
            mazdoorName: targetWorker.name,
            workDate: todayStr,
            workDetail: `${task.title} (Invoice #${invoiceNumber})`,
            amount: task.amount,
            paidAmount: 0,
            balance: targetWorker.balance,
            notes: `Auto-posted from sale #${invoiceNumber}`,
            createdAt: new Date().toISOString(),
            syncStatus: 'pending',
          })
        }
      }
    }
  }

  setStored(STORAGE_KEYS.MAZDOORS, workers)
  setStored(STORAGE_KEYS.MAZDOORI_ENTRIES, entries)

  // Save sale
  const sales = getStored<unknown[]>(STORAGE_KEYS.SALES, [])
  sales.push({ ...saleInput, id: saleId, invoiceNumber, createdAt: new Date().toISOString() })
  setStored(STORAGE_KEYS.SALES, sales)

  // Enqueue sync record
  await enqueueSyncRecord({
    id: `sq-${Date.now()}`,
    entityType: 'sale',
    entityId: saleId,
    operation: 'INSERT',
    payload: { ...saleInput, id: saleId, invoiceNumber } as unknown as Record<string, unknown>,
    status: 'pending',
    retryCount: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return invoiceNumber
}

export async function getSyncQueue(limit = 50): Promise<SyncQueueRecord[]> {
  if (isTauri()) {
    return invoke<SyncQueueRecord[]>('get_sync_queue', { limit })
  }
  const queue = getStored<SyncQueueRecord[]>(STORAGE_KEYS.SYNC_QUEUE, [])
  return queue
    .filter((q) => q.status === 'pending' || q.status === 'failed')
    .slice(0, limit)
}

export async function updateSyncStatus(
  queueId: string,
  status: 'pending' | 'syncing' | 'synced' | 'failed',
  lastError?: string
): Promise<boolean> {
  if (isTauri()) {
    return invoke<boolean>('update_sync_status', {
      queueId,
      status,
      lastError: lastError || null,
    })
  }

  const queue = getStored<SyncQueueRecord[]>(STORAGE_KEYS.SYNC_QUEUE, [])
  const item = queue.find((q) => q.id === queueId)
  if (item) {
    item.status = status
    if (lastError) item.lastError = lastError
    if (status === 'failed') item.retryCount += 1
    item.updatedAt = new Date().toISOString()
    setStored(STORAGE_KEYS.SYNC_QUEUE, queue)
  }
  return true
}

async function enqueueSyncRecord(record: SyncQueueRecord): Promise<void> {
  const queue = getStored<SyncQueueRecord[]>(STORAGE_KEYS.SYNC_QUEUE, [])
  queue.push(record)
  setStored(STORAGE_KEYS.SYNC_QUEUE, queue)
}

// ----------------------------------------------------------------------------
// Mazdoor (Worker) Services
// ----------------------------------------------------------------------------

export async function getMazdoors(): Promise<Mazdoor[]> {
  if (isTauri()) {
    return invoke<Mazdoor[]>('get_mazdoors')
  }
  return getStored<Mazdoor[]>(STORAGE_KEYS.MAZDOORS, [
    {
      id: 'm1',
      name: 'Muhammad Aslam',
      phone: '0301-2345678',
      totalWork: 45000,
      totalPaid: 35000,
      balance: 10000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    },
    {
      id: 'm2',
      name: 'Tariq Mehmood',
      phone: '0312-3456789',
      totalWork: 32000,
      totalPaid: 32000,
      balance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    },
  ])
}

export async function createMazdoor(data: { name: string; phone?: string }): Promise<Mazdoor> {
  const newWorker: Mazdoor = {
    id: `m-${Date.now()}`,
    name: data.name,
    phone: data.phone || '',
    totalWork: 0,
    totalPaid: 0,
    balance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  }

  if (isTauri()) {
    return invoke<Mazdoor>('create_mazdoor', { mazdoor: newWorker })
  }

  const workers = await getMazdoors()
  const updated = [newWorker, ...workers]
  setStored(STORAGE_KEYS.MAZDOORS, updated)
  return newWorker
}

export async function updateMazdoor(worker: Mazdoor): Promise<Mazdoor> {
  if (isTauri()) {
    return invoke<Mazdoor>('update_mazdoor', { mazdoor: worker })
  }

  const workers = await getMazdoors()
  const idx = workers.findIndex((w) => w.id === worker.id)
  if (idx !== -1) {
    workers[idx] = { ...worker, updatedAt: new Date().toISOString() }
    setStored(STORAGE_KEYS.MAZDOORS, workers)
  }
  return worker
}

export async function deleteMazdoor(id: string): Promise<boolean> {
  if (isTauri()) {
    return invoke<boolean>('delete_mazdoor', { mazdoorId: id })
  }

  const workers = await getMazdoors()
  const filtered = workers.filter((w) => w.id !== id)
  setStored(STORAGE_KEYS.MAZDOORS, filtered)
  return true
}

export async function getMazdooriEntries(mazdoorId?: string): Promise<MazdooriEntry[]> {
  if (isTauri()) {
    return invoke<MazdooriEntry[]>('get_mazdoori_entries', { mazdoorId: mazdoorId || null })
  }

  const all = getStored<MazdooriEntry[]>(STORAGE_KEYS.MAZDOORI_ENTRIES, [
    {
      id: 'me1',
      mazdoorId: 'm1',
      mazdoorName: 'Muhammad Aslam',
      workDate: new Date().toISOString().slice(0, 10),
      workDetail: 'Chadar Bending (Invoice #ARKI-1001)',
      amount: 5000,
      paidAmount: 0,
      balance: 10000,
      notes: 'Auto-posted labor task',
      createdAt: new Date().toISOString(),
      syncStatus: 'synced',
    },
    {
      id: 'me2',
      mazdoorId: 'm1',
      mazdoorName: 'Muhammad Aslam',
      workDate: new Date().toISOString().slice(0, 10),
      workDetail: 'Payment Received / Payout',
      amount: 0,
      paidAmount: 2000,
      balance: 8000,
      notes: 'Weekly cash payout',
      createdAt: new Date().toISOString(),
      syncStatus: 'synced',
    },
  ])

  if (mazdoorId) {
    return all.filter((e) => e.mazdoorId === mazdoorId)
  }
  return all
}

export async function createMazdooriEntry(entry: {
  mazdoorId: string
  mazdoorName: string
  workDate: string
  workDetail: string
  amount: number
  paidAmount: number
  notes?: string
}): Promise<MazdooriEntry> {
  const newEntry: MazdooriEntry = {
    id: `me-${Date.now()}`,
    mazdoorId: entry.mazdoorId,
    mazdoorName: entry.mazdoorName,
    workDate: entry.workDate,
    workDetail: entry.workDetail,
    amount: entry.amount,
    paidAmount: entry.paidAmount,
    balance: entry.amount - entry.paidAmount,
    notes: entry.notes,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
  }

  if (isTauri()) {
    return invoke<MazdooriEntry>('create_mazdoori_entry', { entry: newEntry })
  }

  const workers = await getMazdoors()
  const worker = workers.find((w) => w.id === entry.mazdoorId)
  if (worker) {
    worker.totalWork += entry.amount
    worker.totalPaid += entry.paidAmount
    worker.balance += entry.amount - entry.paidAmount
    worker.updatedAt = new Date().toISOString()
    setStored(STORAGE_KEYS.MAZDOORS, workers)
    newEntry.balance = worker.balance
  }

  const entries = getStored<MazdooriEntry[]>(STORAGE_KEYS.MAZDOORI_ENTRIES, [])
  entries.unshift(newEntry)
  setStored(STORAGE_KEYS.MAZDOORI_ENTRIES, entries)
  return newEntry
}

export async function deleteMazdooriEntry(id: string): Promise<boolean> {
  if (isTauri()) {
    return invoke<boolean>('delete_mazdoori_entry', { entryId: id })
  }

  const entries = getStored<MazdooriEntry[]>(STORAGE_KEYS.MAZDOORI_ENTRIES, [])
  const filtered = entries.filter((e) => e.id !== id)
  setStored(STORAGE_KEYS.MAZDOORI_ENTRIES, filtered)
  return true
}

export async function payMazdoor(payment: {
  mazdoorId: string
  amount: number
  notes?: string
}): Promise<boolean> {
  if (isTauri()) {
    return invoke<boolean>('pay_mazdoor', { payment })
  }

  const workers = await getMazdoors()
  const worker = workers.find((w) => w.id === payment.mazdoorId)
  if (worker) {
    worker.totalPaid += payment.amount
    worker.balance -= payment.amount
    worker.updatedAt = new Date().toISOString()
    setStored(STORAGE_KEYS.MAZDOORS, workers)

    const entries = getStored<MazdooriEntry[]>(STORAGE_KEYS.MAZDOORI_ENTRIES, [])
    entries.unshift({
      id: `me-${Date.now()}`,
      mazdoorId: worker.id,
      mazdoorName: worker.name,
      workDate: new Date().toISOString().slice(0, 10),
      workDetail: 'Payment Received / Payout',
      amount: 0,
      paidAmount: payment.amount,
      balance: worker.balance,
      notes: payment.notes || 'Payout to worker',
      createdAt: new Date().toISOString(),
      syncStatus: 'pending',
    })
    setStored(STORAGE_KEYS.MAZDOORI_ENTRIES, entries)
  }
  return true
}

// ----------------------------------------------------------------------------
// Sales & Reports Services
// ----------------------------------------------------------------------------

export async function getSales(limit = 100): Promise<Sale[]> {
  if (isTauri()) {
    return invoke<Sale[]>('get_sales', { limit })
  }
  return getStored<Sale[]>(STORAGE_KEYS.SALES, [])
}

// ----------------------------------------------------------------------------
// Business Settings Services
// ----------------------------------------------------------------------------

const DEFAULT_SETTINGS: BusinessSettings = {
  id: 'default',
  businessName: 'ANAS ARKI PRESS & LASER CUTTING',
  subtitle: 'PRECISION | QUALITY | YOUR VISION OUR WORK',
  phone: '0300-7973059',
  address: 'Dhuddi wala Lower Canal Near Askari Bandk Main Jaranwala Road',
  invoicePrefix: 'ARKI',
  nextInvoiceNumber: 1001,
  receiptPaperSize: 'A4',
  footerText: 'Thank you for your business!',
  showLogo: true,
  currency: 'PKR',
  currencySymbol: 'Rs',
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  if (isTauri()) {
    return invoke<BusinessSettings>('get_business_settings')
  }
  return getStored<BusinessSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
}

export async function updateBusinessSettings(settings: BusinessSettings): Promise<BusinessSettings> {
  if (isTauri()) {
    return invoke<BusinessSettings>('update_business_settings', { settings })
  }
  setStored(STORAGE_KEYS.SETTINGS, settings)
  return settings
}

