import { invoke } from '@tauri-apps/api/core'
import type { Customer, CustomerLedgerEntry, SaleItem } from '@/types'
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
    }
  }

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
