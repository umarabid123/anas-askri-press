import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { useProducts } from '@/hooks/useProducts'
import { formatPKR } from '@/utils/financial'
import { AddProductModal } from '../components/AddProductModal'
import { EditProductModal } from '../components/EditProductModal'
import type { Item } from '@/types'

const PAGE_SIZE = 10

export function ProductsPage() {
  const {
    products,
    isLoading,
    error,
    addProduct,
    editProduct,
    removeProduct,
  } = useProducts()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [currentPage, setCurrentPage] = useState(1)

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Item | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Item | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      if (p.category?.trim()) set.add(p.category.trim())
    }
    return Array.from(set).sort()
  }, [products])

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    return products.filter((p) => {
      const matchCat =
        selectedCategory === 'ALL' ||
        (p.category && p.category.trim().toLowerCase() === selectedCategory.toLowerCase())
      if (!matchCat) return false

      if (!q) return true
      const name = (p.name || '').toLowerCase()
      const urdu = (p.urduName || '').toLowerCase()
      const cat = (p.category || '').toLowerCase()
      return name.includes(q) || urdu.includes(q) || cat.includes(q)
    })
  }, [products, searchTerm, selectedCategory])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const validPage = Math.min(currentPage, totalPages)
  const paginatedProducts = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE
    return filteredProducts.slice(start, start + PAGE_SIZE)
  }, [filteredProducts, validPage])

  const totalProducts = products.length
  const activeProducts = products.filter((p) => p.isActive !== false).length

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return
    setDeleteError(null)
    try {
      await removeProduct(deletingProduct.id)
      setDeletingProduct(null)
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete product.')
    }
  }

  return (
    <div className="min-h-full flex flex-col gap-4">
      {/* Top Main Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex-1 flex flex-col">
        {/* Title & Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Products & Services</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                {totalProducts} items
              </span>
            </div>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Manage shop products and services. Products added here automatically show in the bill item selection dropdown.
            </p>
          </div>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-blue-700 hover:bg-blue-800 flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Product</span>
          </Button>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Products</p>
              <p className="text-lg font-bold text-slate-800 leading-tight">{totalProducts}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-xs text-emerald-700 font-medium">Active in Billing</p>
              <p className="text-lg font-bold text-emerald-900 leading-tight">{activeProducts}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/70 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-xs text-purple-700 font-medium">Categories</p>
              <p className="text-lg font-bold text-purple-900 leading-tight">{categories.length}</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search product name, Urdu name, or category…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-10 pl-9.5 pr-4 text-sm rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('ALL')
                setCurrentPage(1)
              }}
              className={`text-xs px-3 py-2 rounded-xl font-medium transition-colors shrink-0 cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat)
                  setCurrentPage(1)
                }}
                className={`text-xs px-3 py-2 rounded-xl font-medium transition-colors shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Urdu Name (اردو نام)</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Default Rate</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading products…
                  </td>
                </tr>
              )}

              {error && !isLoading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              )}

              {!isLoading && paginatedProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <Package className="w-6 h-6 stroke-[2]" />
                      </div>
                      <p className="font-semibold text-slate-800 text-base">No products found</p>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        {searchTerm || selectedCategory !== 'ALL'
                          ? 'Try adjusting your search query or category filter.'
                          : 'Add your first product to display it in the bill selector.'}
                      </p>
                      <Button
                        onClick={() => setIsAddOpen(true)}
                        className="bg-blue-700 hover:bg-blue-800 text-xs shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add Product
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                paginatedProducts.map((product, idx) => {
                  const rowNumber = (validPage - 1) * PAGE_SIZE + idx + 1
                  const isActive = product.isActive !== false

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-medium">
                        {rowNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{product.name}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {product.urduName ? (
                          <span
                            dir="rtl"
                            lang="ur"
                            className="text-base text-slate-800 font-medium inline-block"
                          >
                            {product.urduName}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {product.category ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {product.category}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">General</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium tabular-nums text-slate-800">
                        {product.defaultRate && product.defaultRate > 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            {formatPKR(product.defaultRate)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Variable / 0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isActive ? (
                          <Badge variant="success" size="sm">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm">
                            Inactive
                          </Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(product)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Product"
                            aria-label={`Edit ${product.name}`}
                          >
                            <Edit2 className="w-4 h-4 stroke-[2]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null)
                              setDeletingProduct(product)
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Product"
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="w-4 h-4 stroke-[2]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing {(validPage - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(validPage * PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length}{' '}
              products
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-slate-700">
                {validPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={addProduct}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        onUpdate={editProduct}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => {
          setDeletingProduct(null)
          setDeleteError(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        description={
          deleteError
            ? deleteError
            : `Are you sure you want to delete "${deletingProduct?.name}"? It will no longer show in the billing product selector.`
        }
        confirmText="Delete Product"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
