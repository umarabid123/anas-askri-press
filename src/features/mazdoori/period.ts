import { localDateKey, roundMoney } from '@/utils/financial'
import type { Sale } from '@/types'

export type MazdooriPreset = 'all' | 'today' | 'weekly' | 'monthly' | 'custom'

export function mazdooriPeriod(preset: MazdooriPreset, today: string, from = '', to = '') {
  if (preset === 'today') return { from: today, to: today, label: 'Today Total Mazdoori' }
  if (preset === 'weekly') {
    const start = new Date(today + 'T12:00:00')
    // Friday belongs to the week just completed; the next week opens Saturday.
    start.setDate(start.getDate() - (start.getDay() + 1) % 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 5)
    return { from: localDateKey(start), to: localDateKey(end), label: 'One Week Total Mazdoori' }
  }
  if (preset === 'monthly') {
    const end = new Date(today + 'T12:00:00')
    end.setMonth(end.getMonth() + 1, 0)
    return { from: today.slice(0, 7) + '-01', to: localDateKey(end), label: 'One Month Total Mazdoori' }
  }
  if (preset === 'custom') return { from, to, label: 'Selected Dates Total Mazdoori' }
  return { from: '', to: '', label: 'Total Mazdoori' }
}

export function isInMazdooriPeriod(date: string, period: { from: string; to: string }) {
  const key = localDateKey(date)
  return (!period.from || key >= period.from) && (!period.to || key <= period.to)
}

export function mazdooriSummary(sales: Pick<Sale, 'createdAt' | 'cancelledAt' | 'totalMazdoori'>[]) {
  const active = sales.filter(sale => !sale.cancelledAt && (sale.totalMazdoori || 0) > 0)
  return {
    total: roundMoney(active.reduce((sum, sale) => sum + (sale.totalMazdoori || 0), 0)),
    bills: active.length,
    days: new Set(active.map(sale => localDateKey(sale.createdAt))).size,
  }
}

export function mazdooriDay(date: string) {
  return new Date(localDateKey(date) + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' })
}

// Build the complete ledger before pagination, so totals carry across pages.
export function mazdooriLedger(sales: Sale[]) {
  let totalMazdoori = 0
  let totalWeight = 0
  return [...sales].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id)).map(sale => {
    const mazdoori = roundMoney(sale.totalMazdoori || 0)
    // Weight comes only from items whose unit is 'kg' (QTY items are excluded from weight).
    const weight = roundMoney(
      sale.items.reduce((sum, item) => {
        const isKg = (item.unit || 'kg').toLowerCase() === 'kg'
        return sum + (isKg ? item.quantity : 0)
      }, 0)
    )
    if (!sale.cancelledAt) {
      totalMazdoori = roundMoney(totalMazdoori + mazdoori)
      totalWeight = roundMoney(totalWeight + weight)
    }
    return { sale, mazdoori, weight, totalMazdoori, totalWeight }
  })
}

export function mazdooriWeeks(sales: Sale[]) {
  const groups = new Map<string, { from: string; to: string; sales: Sale[] }>()
  for (const sale of sales) {
    if ((sale.totalMazdoori || 0) <= 0) continue
    const period = mazdooriPeriod('weekly', localDateKey(sale.createdAt))
    // Friday records remain in All Time, outside the Saturday–Thursday workweek.
    if (!isInMazdooriPeriod(sale.createdAt, period)) continue
    let group = groups.get(period.from)
    if (!group) {
      group = { from: period.from, to: period.to, sales: [] }
      groups.set(period.from, group)
    }
    group.sales.push(sale)
  }
  return [...groups.values()].sort((a, b) => b.from.localeCompare(a.from)).map(group => ({
    ...group,
    sales: [...group.sales].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)),
    ...mazdooriSummary(group.sales),
  }))
}
