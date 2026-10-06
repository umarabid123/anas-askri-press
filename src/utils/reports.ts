import type { Sale } from '@/types'
import type { Receipt } from '@/services/sqlite.service'
import { localDateKey, roundMoney } from './financial'

// Cancelled invoices stay in history but count towards no totals
export function activeSales(sales: Sale[]) {
  return sales.filter(sale => !sale.cancelledAt)
}
// Payments taken at a cancelled sale were refunded
export function activePayments(payments: Receipt[], sales: Sale[]) {
  const cancelled = new Set(sales.filter(sale => sale.cancelledAt).map(sale => sale.id))
  return payments.filter(payment => !payment.saleId || !cancelled.has(payment.saleId))
}
export function dailyReport(sales: Sale[], payments: Receipt[]) {
  const days = new Map<string, { date: string; bills: number; total: number; received: number; credit: number }>()
  const day = (date: string) => { const key = localDateKey(date); let value = days.get(key); if (!value) { value = { date: key, bills: 0, total: 0, received: 0, credit: 0 }; days.set(key, value) }; return value }
  for (const sale of activeSales(sales)) { const row = day(sale.createdAt); row.bills++; row.total = roundMoney(row.total + sale.total); row.credit = roundMoney(row.credit + sale.remainingCredit) }
  for (const payment of payments) { const row = day(payment.paymentDate); row.received = roundMoney(row.received + payment.amount) }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date))
}
