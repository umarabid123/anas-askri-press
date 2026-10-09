import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toast.store'
import type { Item } from '@/types'

const QUICK_CATEGORIES = ['Sheets', 'Bending', 'Door Frame', 'Laser Cutting', 'CNC Cutting', 'Gates', 'General']

interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: Item | null
  onUpdate: (data: Item) => Promise<Item>
}

export function EditProductModal({ isOpen, onClose, product, onUpdate }: EditProductModalProps) {
  const [name, setName] = useState('')
  const [urduName, setUrduName] = useState('')
  const [category, setCategory] = useState('')
  const [defaultRate, setDefaultRate] = useState<string>('')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<{ name?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (product) {
      setName(product.name || '')
      setUrduName(product.urduName || '')
      setCategory(product.category || '')
      setDefaultRate(product.defaultRate ? String(product.defaultRate) : '')
      setIsActive(product.isActive !== false)
      setErrors({})
    }
  }, [product])

  if (!product) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const trimmedName = name.trim()
    if (!trimmedName) {
      setErrors({ name: 'Product name is required.' })
      return
    }

    setIsSubmitting(true)
    try {
      await onUpdate({
        ...product,
        name: trimmedName,
        urduName: urduName.trim() || null,
        category: category.trim() || null,
        defaultRate: defaultRate ? Math.max(0, parseFloat(defaultRate) || 0) : 0,
        isActive,
      })
      toast.success('Product updated successfully.')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update product.'
      toast.error(msg)
      setErrors({ general: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Product / Service"
      description="Update product details, pricing, and visibility in billing."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
            {errors.general}
          </div>
        )}

        <Input
          label="Product / Service Name (English)"
          placeholder="e.g. Steel Sheet 16 Gauge"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoFocus
          required
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Urdu Name / اردو نام <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            dir="rtl"
            placeholder="مثال: سٹیل شیٹ 16 گیج"
            value={urduName}
            onChange={(e) => setUrduName(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-right text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        <div>
          <Input
            label="Category"
            placeholder="e.g. Sheets, Bending, Laser Cutting"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                  category === cat
                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-medium'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Default Rate (Rs.)"
          type="number"
          step="any"
          min="0"
          placeholder="0.00"
          value={defaultRate}
          onChange={(e) => setDefaultRate(e.target.value)}
        />

        {/* Status Active toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70">
          <div>
            <p className="text-xs font-semibold text-slate-800">Product Active</p>
            <p className="text-[11px] text-slate-500">Active products appear in the bill dropdown.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(!isActive)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              isActive ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                isActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="bg-blue-700 hover:bg-blue-800">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
