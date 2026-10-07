import type { Customer, Sale } from '@/types'
import type { ShopInvoiceData } from './components/ShopInvoiceTemplate'

// Preview data for a saved invoice; the customer record adds the address
export function saleToInvoiceData(sale: Sale, customer?: Customer | null): ShopInvoiceData {
  return {
    saleId: sale.id,
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
