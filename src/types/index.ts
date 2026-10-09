import type { PaymentMethod, SyncStatus } from '../constants/business'

export interface Customer {
  id: string
  name: string
  mobile: string
  address?: string
  totalPurchase: number
  totalPaid: number
  balance: number // credit owed by customer
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface Item {
  id: string
  name: string
  urduName?: string | null
  category?: string | null
  defaultRate: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type Product = Item

export interface ItemFormData {
  name: string
  urduName?: string
  category?: string
  defaultRate?: number
  isActive?: boolean
}

export interface ItemMazdooriTask {
  id: string
  title: string
  amount: number
  mazdoorName?: string
  workerName?: string
}

export interface SaleItem {
  id: string
  saleId?: string
  itemId?: string
  itemName: string
  quantity: number
  rate: number
  mazdoori: number
  mazdooriTasks?: ItemMazdooriTask[]
  amount: number
}

export interface Sale {
  id: string
  invoiceNumber: string
  customerId?: string | null
  customerName?: string | null
  customerMobile?: string | null
  items: SaleItem[]
  totalMazdoori?: number
  subtotal: number
  discount: number
  total: number
  paidAmount: number
  remainingCredit: number
  paymentMethod: PaymentMethod
  notes?: string
  cancelledAt?: string | null
  cancelReason?: string | null
  createdAt: string
  syncStatus: SyncStatus
}

export interface Expense {
  id: string
  expenseDate: string // YYYY-MM-DD
  category: string
  description?: string | null
  amount: number
  paymentMethod: PaymentMethod
  createdAt: string
  syncStatus: SyncStatus
}

export interface CustomerLedgerEntry {
  id: string
  customerId: string
  date: string
  description: string
  debit: number // increase in balance (new bill)
  credit: number // decrease in balance (payment received)
  balance: number
  saleId?: string
  createdAt: string
  syncStatus: SyncStatus
}

export interface Mazdoor {
  id: string
  name: string
  phone?: string
  totalWork: number
  totalPaid: number
  balance: number
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface MazdooriEntry {
  id: string
  mazdoorId: string
  mazdoorName: string
  workDate: string
  workDetail: string
  amount: number
  paidAmount: number
  balance: number
  notes?: string
  createdAt: string
  syncStatus: SyncStatus
}

export interface BusinessSettings {
  id?: string
  businessName: string
  subtitle: string
  phone: string
  address: string
  logoPath?: string
  invoicePrefix: string
  nextInvoiceNumber: number
  receiptPaperSize: '80mm' | '58mm' | 'A4'
  footerText: string
  showLogo: boolean
  defaultPrinter?: string
  currency: string
  currencySymbol?: string
}
