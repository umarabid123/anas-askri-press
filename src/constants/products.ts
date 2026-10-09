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

export const DEFAULT_PRODUCTS = [
  { id: 'chadar', english: 'Steel Sheet (Chadar)', urdu: 'سٹیل کی چادر' },
  { id: 'dabi', english: 'Sheet Bending (Dabi)', urdu: 'چادر موڑنا (دابی)' },
  { id: 'chowkhat', english: 'Door Frame (Chowkhat)', urdu: 'دروازے کی چوکھٹ' },
  { id: 'laser-grill', english: 'Laser Cut Grill', urdu: 'لیزر کٹ جالی' },
  { id: 'cnc-panel', english: 'CNC Cut Panel', urdu: 'سی این سی کٹ پینل' },
  { id: 'steel-gate', english: 'Steel Gate', urdu: 'سٹیل کا گیٹ' },
] as const

export const PRODUCTS: readonly ProductItem[] = DEFAULT_PRODUCTS

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
