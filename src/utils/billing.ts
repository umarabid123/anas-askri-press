import type { SaleItem } from '@/types'
import { calculateItemAmount, calculateSaleTotal, calculateCredit, roundMoney } from './financial'

export function prepareBill(items: SaleItem[], discount: number, paidAmount: number) {
  if (![discount, paidAmount].every(Number.isFinite) || discount < 0 || paidAmount < 0) {
    throw new Error('Discount and payment must be valid non-negative amounts.')
  }
  const normalized = items.filter(item => item.itemName.trim() || item.rate || item.mazdoori || item.mazdooriTasks?.length).map(item => {
    if (!item.itemName.trim()) throw new Error('Enter a description for every item with an amount.')
    if (![item.quantity, item.rate, item.mazdoori].every(Number.isFinite) || item.quantity <= 0 || item.rate < 0 || item.mazdoori < 0) {
      throw new Error('Quantity must be positive; rate and labor must be non-negative.')
    }
    const tasks = (item.mazdooriTasks || []).map(task => {
      if (!task.title.trim() || !Number.isFinite(task.amount) || task.amount <= 0) throw new Error('Each labor task needs a description and a positive amount.')
      return { ...task, workerName: (task.workerName || task.mazdoorName || '').trim(), amount: roundMoney(task.amount) }
    })
    if (tasks.length && Math.abs(tasks.reduce((sum, task) => sum + task.amount, 0) - item.mazdoori) > 0.01) {
      throw new Error('Labor breakdown must match the item labor amount.')
    }
    const rate = roundMoney(item.rate), mazdoori = roundMoney(item.mazdoori)
    return { ...item, rate, mazdoori, itemName: item.itemName.trim(), mazdooriTasks: tasks, amount: calculateItemAmount(item.quantity, rate, mazdoori) }
  })
  if (!normalized.length) throw new Error('Add at least one item before saving.')
  const subtotal = roundMoney(normalized.reduce((sum, item) => sum + item.amount - item.mazdoori, 0))
  const totalMazdoori = roundMoney(normalized.reduce((sum, item) => sum + item.mazdoori, 0))
  const gross = roundMoney(normalized.reduce((sum, item) => sum + item.amount, 0))
  if (![subtotal, totalMazdoori, gross].every(Number.isFinite) || gross > 9_999_999_999.99) throw new Error('Bill exceeds the supported amount range.')
  if (discount > gross) throw new Error('Discount cannot exceed the bill amount.')
  const total = calculateSaleTotal(gross, discount)
  if (total <= 0) throw new Error('Total bill amount must be greater than zero.')
  if (roundMoney(paidAmount) > total) throw new Error('Paid amount cannot exceed the total bill.')
  return { items: normalized, subtotal, totalMazdoori, discount: roundMoney(discount), total, paidAmount: roundMoney(paidAmount), remainingCredit: calculateCredit(total, paidAmount) }
}
