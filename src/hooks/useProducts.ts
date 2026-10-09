import { useEffect } from 'react'
import { useProductStore } from '@/stores/products.store'

export function useProducts() {
  const {
    products,
    isLoading,
    error,
    hasLoaded,
    loadProducts,
    addProduct,
    editProduct,
    removeProduct,
  } = useProductStore()

  useEffect(() => {
    if (!hasLoaded) {
      loadProducts()
    }
  }, [hasLoaded, loadProducts])

  return {
    products,
    isLoading,
    error,
    refresh: loadProducts,
    addProduct,
    editProduct,
    removeProduct,
  }
}
