/**
 * Pure financial and calculation helpers for Arki POS
 * Ensures one single source of truth for all monetary math.
 */

export function formatCurrency(amount: number): string {
  // `|| 0` turns -0 (e.g. from -0.004) into 0 so it never shows as "Rs -0"
  const rounded = Math.round((Number(amount) || 0) * 100) / 100 || 0
  return `Rs ${rounded.toLocaleString('en-PK')}`
}

export const formatPKR = formatCurrency

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

export function localDateKey(value: string | Date = new Date()): string {
  const date = value instanceof Date ? value : parseDate(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Validates a calendar date without letting JavaScript roll invalid dates forward. */
export function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function calculateItemAmount(quantity: number, rate: number): number {
  const q = Number(quantity) || 0
  const r = Number(rate) || 0
  return Math.round(q * r * 100) / 100
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

export function parseDate(dateStr?: string | Date | null): Date {
  if (!dateStr) return new Date()
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date() : dateStr
  const cleaned = String(dateStr).trim()
  if (!cleaned) return new Date()
  // Replace space between date and time with 'T' and append 'Z' if no timezone is present (e.g. SQLite datetime)
  const isoLike = cleaned.includes(' ') && !cleaned.includes('T') ? cleaned.replace(' ', 'T') + 'Z' : cleaned
  const d = new Date(isoLike)
  if (isNaN(d.getTime())) {
    const fallback = new Date(cleaned)
    return isNaN(fallback.getTime()) ? new Date() : fallback
  }
  return d
}

export function formatDate(dateStr?: string | Date | null): string {
  const date = parseDate(dateStr)
  try {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(dateStr || '')
  }
}

export function formatTime(dateStr?: string | Date | null): string {
  const date = parseDate(dateStr)
  try {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return ''
  }
}

export function generateInvoiceNumber(prefix: string, sequenceNumber: number): string {
  const padded = String(sequenceNumber).padStart(4, '0')
  return `${prefix}-${padded}`
}
