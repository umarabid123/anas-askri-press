export interface ProductItem {
  id: string
  name?: string
  english?: string
  urduName?: string | null
  urdu?: string
  category?: string | null
  defaultRate?: number
  isActive?: boolean
}

export const PRODUCTS: readonly ProductItem[] = []

export type Product = ProductItem

export function productName(product: ProductItem): string {
  const eng = (product.name || product.english || '').trim()
  const urdu = (product.urduName || product.urdu || '').trim()
  if (eng && urdu) return `${eng} / ${urdu}`
  return eng || urdu
}

export function searchProducts(value: string, list: readonly ProductItem[] = PRODUCTS): readonly ProductItem[] {
  const query = value.trim().toLocaleLowerCase()
  if (!query || list.some(product => productName(product).toLocaleLowerCase() === query)) return list
  return list.filter(product => {
    const full = productName(product).toLocaleLowerCase()
    const eng = (product.name || product.english || '').toLocaleLowerCase()
    const urdu = (product.urduName || product.urdu || '').toLocaleLowerCase()
    const cat = (product.category || '').toLocaleLowerCase()
    return full.includes(query) || eng.includes(query) || urdu.includes(query) || cat.includes(query)
  })
}
