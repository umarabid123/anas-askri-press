import type { SaleItem } from '@/types'
import { calculateItemAmount, calculateSaleTotal, calculateCredit, roundMoney } from './financial'

export function prepareBill(items: SaleItem[], discount: number, paidAmount: number) {
  if (![discount, paidAmount].every(Number.isFinite) || discount < 0 || paidAmount < 0) {
    throw new Error('Enter zero or a positive amount for discount and payment.')
  }
  const activeItems = items.filter(item => (item.itemName && item.itemName.trim()) || item.rate > 0 || item.mazdoori > 0 || (item.mazdooriTasks && item.mazdooriTasks.length > 0))
  if (!activeItems.length) throw new Error('Please add at least one item.')

  const normalized = activeItems.map((item, index) => {
    const rowNum = index + 1
    if (!item.itemName || !item.itemName.trim()) {
      throw new Error(`Row #${rowNum}: Item / Description is required.`)
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error(`Row #${rowNum} ("${item.itemName.trim()}"): Qty/Kg is required and must be greater than 0.`)
    }
    if (!Number.isFinite(item.rate) || item.rate <= 0) {
      throw new Error(`Row #${rowNum} ("${item.itemName.trim()}"): Rate (Rs) is required and must be greater than 0.`)
    }
    if (!Number.isFinite(item.mazdoori) || item.mazdoori < 0) {
      throw new Error(`Row #${rowNum} ("${item.itemName.trim()}"): Mazdoori (Rs) is required (enter 0 if no labour).`)
    }

    const tasks = (item.mazdooriTasks || []).map(task => {
      if (!task.title.trim() || !Number.isFinite(task.amount) || task.amount <= 0) {
        throw new Error(`Row #${rowNum}: Add a work name and an amount above zero for each mazdoori entry.`)
      }
      return { ...task, workerName: (task.workerName || task.mazdoorName || '').trim(), amount: roundMoney(task.amount) }
    })
    if (tasks.length && Math.abs(tasks.reduce((sum, task) => sum + task.amount, 0) - item.mazdoori) > 0.01) {
      throw new Error(`Row #${rowNum}: Total mazdoori must match the amounts added for workers.`)
    }
    const rate = roundMoney(item.rate), mazdoori = roundMoney(item.mazdoori)
    return { ...item, rate, mazdoori, itemName: item.itemName.trim(), mazdooriTasks: tasks, amount: calculateItemAmount(item.quantity, rate) }
  })
  const subtotal = roundMoney(normalized.reduce((sum, item) => sum + item.amount, 0))
  const totalMazdoori = roundMoney(normalized.reduce((sum, item) => sum + item.mazdoori, 0))
  const gross = roundMoney(normalized.reduce((sum, item) => sum + item.amount, 0))
  if (![subtotal, totalMazdoori, gross].every(Number.isFinite) || gross > 9_999_999_999.99) throw new Error('Bill amount is too large. Check the quantity and rate.')
  if (discount > gross) throw new Error('Discount cannot exceed the bill amount.')
  const total = calculateSaleTotal(gross, discount)
  if (total <= 0) throw new Error('Total bill amount must be greater than zero.')
  if (roundMoney(paidAmount) > total) throw new Error('Payment received cannot be more than the bill total.')
  return { items: normalized, subtotal, totalMazdoori, discount: roundMoney(discount), total, paidAmount: roundMoney(paidAmount), remainingCredit: calculateCredit(total, paidAmount) }
}
