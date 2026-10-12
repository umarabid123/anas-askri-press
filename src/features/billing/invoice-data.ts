import type { Customer, CustomerLedgerEntry, Sale } from '@/types'
import type { ShopInvoiceData } from './components/ShopInvoiceTemplate'
import { roundMoney } from '@/utils/financial'
import { oldUdharNote } from '@/utils/billing'

export function previousInvoiceBalance(data: Pick<ShopInvoiceData, 'saleId' | 'invoiceNumber'>, ledger: readonly CustomerLedgerEntry[]): number {
  const entry = ledger.find(row => row.description === `Invoice #${data.invoiceNumber}` && (!row.saleId || !data.saleId || row.saleId === data.saleId))
  if (!entry) throw new Error('Could not find this bill in the customer account. Refresh the records and try again.')
  return roundMoney(entry.balance - entry.debit + entry.credit)
}

// Old udhar cleared with money received on this bill (kept as separate receipts, not on the bill itself)
export function invoiceOldUdharPaid(data: Pick<ShopInvoiceData, 'invoiceNumber'>, ledger: readonly CustomerLedgerEntry[]): number {
  const note = oldUdharNote(data.invoiceNumber)
  return roundMoney(ledger.filter(row => row.description.endsWith(note)).reduce((sum, row) => sum + row.credit - row.debit, 0))
}

export function invoiceAccountTotals(data: Pick<ShopInvoiceData, 'total' | 'paidAmount' | 'previousBalance' | 'oldUdharPaid'>) {
  const previousBalance = data.previousBalance ?? 0
  const total = roundMoney(data.total + previousBalance)
  const paid = roundMoney(data.paidAmount + (data.oldUdharPaid ?? 0))
  const balance = roundMoney(total - paid)
  return { previousBalance, total: Math.max(0, total), paid, balance: Math.max(0, balance), advance: Math.max(0, -balance) }
}

// Preview data for a saved invoice; the customer record adds the address
export function saleToInvoiceData(sale: Sale, customer?: Customer | null): ShopInvoiceData {
  return {
    saleId: sale.id,
    customerId: sale.customerId || null,
    invoiceNumber: sale.invoiceNumber,
    date: sale.createdAt,
    customer: customer || null,
    customerName: sale.customerName || '',
    customerPhone: sale.customerMobile || '',
    customerAddress: customer?.address || '',
    items: sale.items || [],
    subtotal: sale.subtotal,
    totalMazdoori: sale.totalMazdoori || 0,
    discount: sale.discount || 0,
    total: sale.total,
    paidAmount: sale.paidAmount,
    remainingCredit: sale.remainingCredit,
    paymentMethod: sale.paymentMethod,
    cancelledAt: sale.cancelledAt || null,
    cancelReason: sale.cancelReason || null,
  }
}
