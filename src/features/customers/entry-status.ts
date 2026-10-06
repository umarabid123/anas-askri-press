import type { CustomerLedgerEntry, Sale } from '@/types'

interface EntryStatus {
  label: string
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'default'
  detail: string
}

export function billStatus(sale: Sale): EntryStatus {
  if (sale.cancelledAt) {
    return sale.cancelReason?.startsWith('Updated:')
      ? { label: 'Old Bill', variant: 'default', detail: sale.cancelReason }
      : { label: 'Cancelled', variant: 'danger', detail: 'This bill was cancelled and no longer counts towards customer dues.' }
  }
  return sale.notes?.startsWith('Updated from bill #')
    ? { label: 'Updated Bill', variant: 'primary', detail: 'This is the corrected bill. The old copy stays in history.' }
    : { label: 'Bill Added', variant: 'primary', detail: 'This bill counts towards the customer account. Payments appear separately below.' }
}

export function ledgerEntryStatus(entry: CustomerLedgerEntry, sales: Sale[]): EntryStatus {
  // Older records may have the invoice number in their description only.
  const sale = entry.saleId
    ? sales.find(sale => sale.id === entry.saleId)
    : sales.find(sale => entry.description === `Invoice #${sale.invoiceNumber}` || entry.description.startsWith(`Invoice #${sale.invoiceNumber} cancelled`))
  if (sale) {
    const isReversal = entry.description.startsWith(`Invoice #${sale.invoiceNumber} cancelled`)
    if (isReversal) {
      return sale.cancelReason?.startsWith('Updated:')
        ? { label: 'Bill Updated', variant: 'success', detail: 'The old bill amount was removed and replaced by the updated bill.' }
        : { label: 'Bill Cancelled', variant: 'danger', detail: 'This entry removes the cancelled bill from the customer account.' }
    }
    return billStatus(sale)
  }
  if (/^Payment Received(?:\s|$)/i.test(entry.description) && entry.credit > 0 && entry.debit === 0) {
    return { label: 'Payment Received', variant: 'success', detail: 'Money received from this customer.' }
  }
  return { label: entry.debit > 0 ? 'Amount Added' : entry.credit > 0 ? 'Amount Reduced' : 'Record Added', variant: 'default', detail: 'An account entry. See the description for details.' }
}
