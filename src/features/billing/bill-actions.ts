import { useCartStore } from '@/stores/cart.store'
import type { Customer, Sale } from '@/types'

export function confirmLeaveDraft(): boolean {
  const cart = useCartStore.getState()
  if (cart.savingBill) return false
  const hasDraft = cart.editingSale || cart.customer || cart.items.some(item => item.itemName.trim() || item.rate || item.mazdoori) || cart.notes.trim() || cart.paidAmount || cart.discount
  return !hasDraft || window.confirm('Your changes are not saved. Start a new bill and leave these changes?')
}

export function startNewBill(customer?: Customer): boolean {
  if (!confirmLeaveDraft()) return false
  useCartStore.getState().resetCart()
  if (customer) useCartStore.getState().setCustomer(customer)
  return true
}

export function editBlockReason(saleId: string, sales: Sale[]): string | null {
  const sale = sales.find(sale => sale.id === saleId)
  if (!sale) return 'This bill was not found. It cannot be updated.'
  if (sale.cancelledAt) return sale.cancelReason?.startsWith('Updated:')
    ? 'This is an old bill. It has already been replaced and cannot be edited.'
    : 'This bill was cancelled. It cannot be edited.'
  return null
}
