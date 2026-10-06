import type { SaleItem } from '@/types'
import { calculateItemAmount, calculateSaleTotal, calculateCredit, roundMoney } from './financial'

export function prepareBill(items: SaleItem[], discount: number, paidAmount: number) {
  if (![discount, paidAmount].every(Number.isFinite) || discount < 0 || paidAmount < 0) {
    throw new Error('Enter zero or a positive amount for discount and payment.')
  }
  const normalized = items.filter(item => item.itemName.trim() || item.rate || item.mazdoori || item.mazdooriTasks?.length).map(item => {
    if (!item.itemName.trim()) throw new Error('Enter a description for every item with an amount.')
    if (![item.quantity, item.rate, item.mazdoori].every(Number.isFinite) || item.quantity <= 0 || item.rate < 0 || item.mazdoori < 0) {
      throw new Error('Quantity must be more than zero. Rate and mazdoori cannot be below zero.')
    }
    const tasks = (item.mazdooriTasks || []).map(task => {
      if (!task.title.trim() || !Number.isFinite(task.amount) || task.amount <= 0) throw new Error('Add a work name and an amount above zero for each mazdoori entry.')
      return { ...task, workerName: (task.workerName || task.mazdoorName || '').trim(), amount: roundMoney(task.amount) }
    })
    if (tasks.length && Math.abs(tasks.reduce((sum, task) => sum + task.amount, 0) - item.mazdoori) > 0.01) {
      throw new Error('Total mazdoori must match the amounts added for the workers.')
    }
    const rate = roundMoney(item.rate), mazdoori = roundMoney(item.mazdoori)
    return { ...item, rate, mazdoori, itemName: item.itemName.trim(), mazdooriTasks: tasks, amount: calculateItemAmount(item.quantity, rate, mazdoori) }
  })
  if (!normalized.length) throw new Error('Add at least one item before saving.')
  const subtotal = roundMoney(normalized.reduce((sum, item) => sum + item.amount - item.mazdoori, 0))
  const totalMazdoori = roundMoney(normalized.reduce((sum, item) => sum + item.mazdoori, 0))
  const gross = roundMoney(normalized.reduce((sum, item) => sum + item.amount, 0))
  if (![subtotal, totalMazdoori, gross].every(Number.isFinite) || gross > 9_999_999_999.99) throw new Error('Bill amount is too large. Check the quantity and rate.')
  if (discount > gross) throw new Error('Discount cannot exceed the bill amount.')
  const total = calculateSaleTotal(gross, discount)
  if (total <= 0) throw new Error('Total bill amount must be greater than zero.')
  if (roundMoney(paidAmount) > total) throw new Error('Payment received cannot be more than the bill total.')
  return { items: normalized, subtotal, totalMazdoori, discount: roundMoney(discount), total, paidAmount: roundMoney(paidAmount), remainingCredit: calculateCredit(total, paidAmount) }
}
