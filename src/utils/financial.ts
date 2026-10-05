/**
 * Pure financial and calculation helpers for Arki POS
 * Ensures one single source of truth for all monetary math.
 */

export function formatCurrency(amount: number): string {
  const rounded = Math.round((Number(amount) || 0) * 100) / 100
  return `Rs ${rounded.toLocaleString('en-PK')}`
}

export const formatPKR = formatCurrency

export function calculateItemAmount(quantity: number, rate: number, mazdoori: number = 0): number {
  const q = Number(quantity) || 0
  const r = Number(rate) || 0
  const m = Number(mazdoori) || 0
  return Math.round((q * r + m) * 100) / 100
}

export function calculateSubtotal(items: Array<{ amount: number }>): number {
  const sum = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0)
  return Math.round(sum * 100) / 100
}

export function calculateSaleTotal(subtotal: number, discount: number = 0): number {
  const s = Number(subtotal) || 0
  const d = Math.max(0, Number(discount) || 0)
  return Math.max(0, Math.round((s - d) * 100) / 100)
}

export function calculateCredit(total: number, paidAmount: number): number {
  const t = Number(total) || 0
  const p = Math.max(0, Number(paidAmount) || 0)
  return Math.max(0, Math.round((t - p) * 100) / 100)
}

export function formatDate(dateStr?: string | Date): string {
  const date = dateStr ? new Date(dateStr) : new Date()
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(dateStr?: string | Date): string {
  const date = dateStr ? new Date(dateStr) : new Date()
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function generateInvoiceNumber(prefix: string, sequenceNumber: number): string {
  const padded = String(sequenceNumber).padStart(4, '0')
  return `${prefix}-${padded}`
}
