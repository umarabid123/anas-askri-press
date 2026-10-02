import { create } from 'zustand'
import type { Customer, SaleItem } from '../types'
import { calculateCredit, calculateItemAmount, calculateSaleTotal, calculateSubtotal } from '../utils/financial'

interface CartState {
  customer: Customer | null
  items: SaleItem[]
  discount: number
  paidAmount: number
  paymentMethod: 'cash' | 'bank'
  notes: string

  // Actions
  setCustomer: (customer: Customer | null) => void
  addItem: (item?: Partial<SaleItem>) => void
  updateItem: (id: string, updates: Partial<SaleItem>) => void
  removeItem: (id: string) => void
  setDiscount: (discount: number) => void
  setPaidAmount: (paid: number) => void
  setPaymentMethod: (method: 'cash' | 'bank') => void
  setNotes: (notes: string) => void
  resetCart: () => void

  // Computed getters
  getSubtotal: () => number
  getTotal: () => number
  getCredit: () => number
  getTotalQuantity: () => number
}

const createDefaultItem = (): SaleItem => ({
  id: crypto.randomUUID(),
  itemName: '',
  quantity: 1,
  rate: 0,
  amount: 0,
})

export const useCartStore = create<CartState>((set, get) => ({
  customer: null,
  items: [createDefaultItem()],
  discount: 0,
  paidAmount: 0,
  paymentMethod: 'cash',
  notes: '',

  setCustomer: (customer) => set({ customer }),

  addItem: (item) =>
    set((state) => {
      const newItem: SaleItem = {
        id: crypto.randomUUID(),
        itemName: item?.itemName || '',
        quantity: item?.quantity ?? 1,
        rate: item?.rate ?? 0,
        amount: calculateItemAmount(item?.quantity ?? 1, item?.rate ?? 0),
      }
      return { items: [...state.items, newItem] }
    }),

  updateItem: (id, updates) =>
    set((state) => {
      const items = state.items.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, ...updates }
        updated.amount = calculateItemAmount(updated.quantity, updated.rate)
        return updated
      })
      return { items }
    }),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  setDiscount: (discount) => set({ discount: Math.max(0, discount) }),
  setPaidAmount: (paidAmount) => set({ paidAmount: Math.max(0, paidAmount) }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setNotes: (notes) => set({ notes }),

  resetCart: () =>
    set({
      customer: null,
      items: [createDefaultItem()],
      discount: 0,
      paidAmount: 0,
      paymentMethod: 'cash',
      notes: '',
    }),

  getSubtotal: () => calculateSubtotal(get().items),
  getTotal: () => calculateSaleTotal(get().getSubtotal(), get().discount),
  getCredit: () => calculateCredit(get().getTotal(), get().paidAmount),
  getTotalQuantity: () => get().items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0),
}))
