export const PRODUCTS = [
  { id: 'chadar', english: 'Steel Sheet (Chadar)', urdu: 'سٹیل کی چادر' },
  { id: 'dabi', english: 'Sheet Bending (Dabi)', urdu: 'چادر موڑنا (دابی)' },
  { id: 'chowkhat', english: 'Door Frame (Chowkhat)', urdu: 'دروازے کی چوکھٹ' },
  { id: 'laser-grill', english: 'Laser Cut Grill', urdu: 'لیزر کٹ جالی' },
  { id: 'cnc-panel', english: 'CNC Cut Panel', urdu: 'سی این سی کٹ پینل' },
  { id: 'steel-gate', english: 'Steel Gate', urdu: 'سٹیل کا گیٹ' },
] as const

export type Product = typeof PRODUCTS[number]
export function productName(product: Product): string {
  return `${product.english} / ${product.urdu}`
}

export function searchProducts(value: string): readonly Product[] {
  const query = value.trim().toLocaleLowerCase()
  if (!query || PRODUCTS.some(product => productName(product).toLocaleLowerCase() === query)) return PRODUCTS
  return PRODUCTS.filter(product => productName(product).toLocaleLowerCase().includes(query))
}
