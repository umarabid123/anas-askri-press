import type { PaymentMethod, SyncStatus } from '../constants/business'

export type EntitySyncState = SyncStatus

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE'

export type SyncEntityType =
  | 'customers' | 'items' | 'mazdoors' | 'sales' | 'sale_items' | 'sale_item_mazdoori_tasks' | 'payments' | 'mazdoori_entries'
  | 'business_settings'
  | 'customer'
  | 'item'
  | 'sale'
  | 'sale_item'
  | 'sale_item_mazdoori_task'
  | 'payment'
  | 'customer_ledger'
  | 'mazdoor'
  | 'mazdoori_entry'

export interface SyncQueueRecord {
  id: string
  entityType: SyncEntityType
  entityId: string
  operation: SyncOperation
  payload: Record<string, unknown>
  status: EntitySyncState
  retryCount: number
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface SyncResult {
  totalProcessed: number
  successCount: number
  failedCount: number
  errors: Array<{ id: string; error: string }>
}

export type ConflictResolutionStrategy =
  | 'last_write_wins' // Used for mutable entities like customer profile or worker profile
  | 'immutable_append' // Used for financial transactions: invoices, payments, ledger entries are never overwritten

export interface DatabaseMigration {
  version: number
  name: string
  up: string
  down?: string
}

// Aligned row schemas (Snake Case as stored in Postgres & SQLite)
export interface DbCustomerRow {
  id: string
  name: string
  mobile: string
  address: string | null
  total_purchase: number
  total_paid: number
  balance: number
  created_at: string
  updated_at: string
  sync_status: EntitySyncState
}

export interface DbItemRow {
  id: string
  name: string
  category: string | null
  default_rate: number
  is_active: number // 1 or 0 in SQLite, boolean in Postgres
  created_at: string
  updated_at: string
}

export interface DbSaleRow {
  id: string
  invoice_number: string
  customer_id: string | null
  customer_name: string | null
  customer_mobile: string | null
  subtotal: number
  discount: number
  total_mazdoori: number
  total: number
  paid_amount: number
  remaining_credit: number
  payment_method: PaymentMethod
  notes: string | null
  created_at: string
  updated_at: string
  sync_status: EntitySyncState
}

export interface DbSaleItemRow {
  id: string
  sale_id: string
  item_id: string | null
  item_name: string
  quantity: number
  rate: number
  mazdoori: number
  amount: number
  created_at: string
}

export interface DbSaleItemMazdooriTaskRow {
  id: string
  sale_item_id: string
  title: string
  amount: number
  worker_name: string | null
  created_at: string
}

export interface DbPaymentRow {
  id: string
  customer_id: string | null
  sale_id: string | null
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  notes: string | null
  created_at: string
  sync_status: EntitySyncState
}

export interface DbCustomerLedgerRow {
  id: string
  customer_id: string
  date: string
  description: string
  debit: number
  credit: number
  balance: number
  sale_id: string | null
  created_at: string
  sync_status: EntitySyncState
}

export interface DbMazdoorRow {
  id: string
  name: string
  phone: string | null
  total_work: number
  total_paid: number
  balance: number
  created_at: string
  updated_at: string
  sync_status: EntitySyncState
}

export interface DbMazdooriEntryRow {
  id: string
  mazdoor_id: string
  mazdoor_name: string
  work_date: string
  work_detail: string
  amount: number
  paid_amount: number
  balance: number
  notes: string | null
  created_at: string
  sync_status: EntitySyncState
}

export interface DbBusinessSettingsRow {
  id: string
  business_name: string
  subtitle: string
  phone: string
  address: string
  logo_path: string | null
  invoice_prefix: string
  next_invoice_number: number
  receipt_paper_size: string
  footer_text: string
  show_logo: number
  default_printer: string | null
  currency: string
  currency_symbol: string
  updated_at: string
}
