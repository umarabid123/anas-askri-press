import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { productName, searchProducts, type Product } from '@/constants/products'
import { useProductStore } from '@/stores/products.store'
import { cn } from '@/utils/cn'

interface ProductNameInputProps {
  value: string
  onChange: (value: string, product?: Product) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  cell: string
  invalid: boolean
  row: number
}

export function ProductNameInput({ value, onChange, onKeyDown, cell, invalid, row }: ProductNameInputProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 260 })

  const { products: storeProducts, hasLoaded, loadProducts } = useProductStore()

  useEffect(() => {
    if (!hasLoaded) {
      loadProducts()
    }
  }, [hasLoaded, loadProducts])

  const productList = storeProducts.filter((p) => p.isActive !== false)
  const filteredProducts = searchProducts(value, productList)
  const activeProduct = filteredProducts[activeIndex]

  useEffect(() => {
    if (open && activeProduct) {
      document.getElementById(`${id}-${activeProduct.id}`)?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, activeProduct, id])

  useLayoutEffect(() => {
    if (!open) return
    const updatePosition = () => {
      const rect = inputRef.current?.getBoundingClientRect()
      if (!rect) return
      const below = window.innerHeight - rect.bottom - 12
      const above = rect.top - 12
      const height = Math.min(260, Math.max(below, above))
      setPosition({
        left: rect.left,
        width: rect.width,
        top: below >= height ? rect.bottom + 4 : rect.top - height - 4,
        maxHeight: height,
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  const select = (product: Product) => {
    onChange(productName(product), product)
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((index) =>
        filteredProducts.length
          ? index < 0
            ? direction === 1
              ? 0
              : filteredProducts.length - 1
            : (index + direction + filteredProducts.length) % filteredProducts.length
          : -1
      )
      return
    }
    if (open && event.key === 'Enter' && activeProduct) {
      event.preventDefault()
      select(activeProduct)
      return
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') setOpen(false)
    onKeyDown(event)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        role="combobox"
        aria-label={`Product or description, row ${row}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && activeProduct ? `${id}-${activeProduct.id}` : undefined}
        aria-invalid={invalid}
        autoComplete="off"
        dir="auto"
        value={value}
        data-bill-cell={cell}
        onFocus={() => {
          setOpen(true)
          setActiveIndex(-1)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        placeholder="Choose a product or type here"
        className={cn(
          'w-full h-8 pl-3 pr-8 text-sm rounded-lg bg-white focus:outline-none transition-colors',
          invalid
            ? 'border-2 border-red-500 ring-1 ring-red-400 bg-red-50/20 text-slate-900'
            : 'border border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Show products, row ${row}`}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          inputRef.current?.focus()
          setOpen(!open)
          setActiveIndex(-1)
        }}
        className="absolute right-1 top-1 h-6 w-6 flex items-center justify-center text-slate-500 hover:text-blue-600 cursor-pointer"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div
            className="fixed z-[100] rounded-lg border border-slate-200 bg-white shadow-xl overflow-y-auto"
            style={position}
            onMouseDown={(event) => event.preventDefault()}
          >
            <div className="px-3 py-2 text-[11px] font-medium text-slate-500 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span>Choose a product, or type your own description</span>
              <span className="text-[10px] text-slate-400">{filteredProducts.length} items</span>
            </div>
            <div id={id} role="listbox" aria-label="Products">
              {filteredProducts.map((product, index) => {
                const displayName = product.name || product.english || ''
                const urduName = product.urduName || product.urdu
                const hasRate = Boolean(product.defaultRate && product.defaultRate > 0)

                return (
                  <button
                    key={product.id}
                    id={`${id}-${product.id}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={activeIndex === index}
                    onClick={() => select(product)}
                    className={cn(
                      'w-full px-3 py-2 text-sm flex items-center justify-between gap-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-b-0 cursor-pointer',
                      activeIndex === index && 'bg-blue-50 text-blue-700'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span lang="en" className="font-medium truncate text-slate-900">
                        {displayName}
                      </span>
                      {product.category && (
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                          {product.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasRate && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Rs. {product.defaultRate}
                        </span>
                      )}
                      {urduName && (
                        <span lang="ur" dir="rtl" className="text-[15px] font-medium text-slate-700">
                          {urduName}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
            {!filteredProducts.length && (
              <p className="px-3 py-3 text-xs text-slate-500 text-center">
                No matching product found. You can keep whatever you typed.
              </p>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
