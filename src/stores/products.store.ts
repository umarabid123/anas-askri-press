import { create } from 'zustand'
import type { Item, ItemFormData } from '@/types'
import { getItems, createItem, updateItem, deleteItem } from '@/services/sqlite.service'

interface ProductsState {
  products: Item[]
  isLoading: boolean
  error: string | null
  hasLoaded: boolean
  loadProducts: () => Promise<void>
  addProduct: (data: ItemFormData) => Promise<Item>
  editProduct: (item: Item) => Promise<Item>
  removeProduct: (id: string) => Promise<boolean>
}

export const useProductStore = create<ProductsState>((set) => ({
  products: [],
  isLoading: false,
  error: null,
  hasLoaded: false,

  loadProducts: async () => {
    set({ isLoading: true, error: null })
    try {
      const items = await getItems()
      set({ products: items, isLoading: false, hasLoaded: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      set({ error: message, isLoading: false })
    }
  },

  addProduct: async (data: ItemFormData) => {
    const created = await createItem(data)
    set((state) => ({ products: [created, ...state.products.filter(p => p.id !== created.id)] }))
    return created
  },

  editProduct: async (item: Item) => {
    const updated = await updateItem(item)
    set((state) => ({
      products: state.products.map((p) => (p.id === updated.id ? updated : p)),
    }))
    return updated
  },

  removeProduct: async (id: string) => {
    await deleteItem(id)
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }))
    return true
  },
}))
