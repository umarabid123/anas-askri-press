import { create } from 'zustand'
import type { Customer, ItemMazdooriTask, SaleItem } from '../types'
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

  // Item Mazdoori task helpers
  addItemMazdooriTask: (itemId: string, task: Omit<ItemMazdooriTask, 'id'>) => void
  removeItemMazdooriTask: (itemId: string, taskId: string) => void
  updateItemMazdooriTask: (itemId: string, taskId: string, updates: Partial<ItemMazdooriTask>) => void

  setDiscount: (discount: number) => void
  setPaidAmount: (paid: number) => void
  setPaymentMethod: (method: 'cash' | 'bank') => void
  setNotes: (notes: string) => void
  resetCart: () => void

  // Computed getters
  getSubtotal: () => number
  getGoodsSubtotal: () => number
  getTotalMazdoori: () => number
  getTotal: () => number
  getCredit: () => number
  getTotalQuantity: () => number
}

const createInitialItems = (): SaleItem[] => [
  { id: crypto.randomUUID(), itemName: '', quantity: 1, rate: 0, mazdoori: 0, mazdooriTasks: [], amount: 0 },
]

export const useCartStore = create<CartState>((set, get) => ({
  customer: null,
  items: createInitialItems(),
  discount: 0,
  paidAmount: 0,
  paymentMethod: 'cash',
  notes: '',

  setCustomer: (customer) => set({ customer }),

  addItem: (item) =>
    set((state) => {
      const quantity = item?.quantity ?? 1
      const rate = item?.rate ?? 0
      const mazdoori = item?.mazdoori ?? 0
      const newItem: SaleItem = {
        id: crypto.randomUUID(),
        itemName: item?.itemName || '',
        quantity,
        rate,
        mazdoori,
        mazdooriTasks: item?.mazdooriTasks || [],
        amount: calculateItemAmount(quantity, rate, mazdoori),
      }
      return { items: [...state.items, newItem] }
    }),

  updateItem: (id, updates) =>
    set((state) => {
      const items = state.items.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, ...updates }
        updated.amount = calculateItemAmount(updated.quantity, updated.rate, updated.mazdoori)
        return updated
      })
      return { items }
    }),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  addItemMazdooriTask: (itemId, task) =>
    set((state) => {
      const items = state.items.map((item) => {
        if (item.id !== itemId) return item
        const newTask: ItemMazdooriTask = {
          id: crypto.randomUUID(),
          title: task.title || '',
          amount: Math.max(0, Number(task.amount) || 0),
          workerName: task.workerName || task.mazdoorName || '',
        }
        const tasks = [...(item.mazdooriTasks || []), newTask]
        const mazdoori = tasks.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
        return {
          ...item,
          mazdooriTasks: tasks,
          mazdoori,
          amount: calculateItemAmount(item.quantity, item.rate, mazdoori),
        }
      })
      return { items }
    }),

  removeItemMazdooriTask: (itemId, taskId) =>
    set((state) => {
      const items = state.items.map((item) => {
        if (item.id !== itemId) return item
        const tasks = (item.mazdooriTasks || []).filter((t) => t.id !== taskId)
        const mazdoori = tasks.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
        return {
          ...item,
          mazdooriTasks: tasks,
          mazdoori,
          amount: calculateItemAmount(item.quantity, item.rate, mazdoori),
        }
      })
      return { items }
    }),

  updateItemMazdooriTask: (itemId, taskId, updates) =>
    set((state) => {
      const items = state.items.map((item) => {
        if (item.id !== itemId) return item
        const tasks = (item.mazdooriTasks || []).map((t) => (t.id === taskId ? { ...t, ...updates } : t))
        const mazdoori = tasks.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
        return {
          ...item,
          mazdooriTasks: tasks,
          mazdoori,
          amount: calculateItemAmount(item.quantity, item.rate, mazdoori),
        }
      })
      return { items }
    }),

  setDiscount: (discount) => set({ discount: Math.max(0, discount) }),
  setPaidAmount: (paidAmount) => set({ paidAmount: Math.max(0, paidAmount) }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setNotes: (notes) => set({ notes }),

  resetCart: () =>
    set({
      customer: null,
      items: [
        {
          id: crypto.randomUUID(),
          itemName: '',
          quantity: 1,
          rate: 0,
          mazdoori: 0,
          mazdooriTasks: [],
          amount: 0,
        },
      ],
      discount: 0,
      paidAmount: 0,
      paymentMethod: 'cash',
      notes: '',
    }),

  getSubtotal: () => calculateSubtotal(get().items),
  getGoodsSubtotal: () =>
    get().items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0),
  getTotalMazdoori: () =>
    get().items.reduce((sum, it) => sum + (Number(it.mazdoori) || 0), 0),
  getTotal: () => calculateSaleTotal(get().getSubtotal(), get().discount),
  getCredit: () => calculateCredit(get().getTotal(), get().paidAmount),
  getTotalQuantity: () => get().items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0),
}))
