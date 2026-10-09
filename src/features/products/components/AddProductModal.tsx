import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toast.store'
import type { Item, ItemFormData } from '@/types'

const QUICK_CATEGORIES = ['Sheets', 'Bending', 'Door Frame', 'Laser Cutting', 'CNC Cutting', 'Gates', 'General']

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: ItemFormData) => Promise<Item>
}

export function AddProductModal({ isOpen, onClose, onAdd }: AddProductModalProps) {
  const [name, setName] = useState('')
  const [urduName, setUrduName] = useState('')
  const [category, setCategory] = useState('')
  const [defaultRate, setDefaultRate] = useState<string>('')
  const [errors, setErrors] = useState<{ name?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      await onAdd({
        name: trimmedName,
        urduName: urduName.trim() || undefined,
        category: category.trim() || undefined,
        defaultRate: defaultRate ? Math.max(0, parseFloat(defaultRate) || 0) : 0,
        isActive: true,
      })
      toast.success('Product added successfully.')
      setName('')
      setUrduName('')
      setCategory('')
      setDefaultRate('')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add product.'
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
      title="Add New Product / Service"
      description="Create a product or fabrication service. It will appear directly in the bill product selector."
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
          placeholder="e.g. Steel Sheet 16 Gauge or CNC Door Panel"
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
            placeholder="مثال: سٹیل شیٹ 16 گیج یا سی این سی جالی"
            value={urduName}
            onChange={(e) => setUrduName(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-right text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          <p className="text-[11px] text-slate-400 mt-1">Appears alongside the English name in bills and invoice printouts.</p>
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
          placeholder="0.00 (Optional standard rate)"
          value={defaultRate}
          onChange={(e) => setDefaultRate(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="bg-blue-700 hover:bg-blue-800">
            Save Product
          </Button>
        </div>
      </form>
    </Modal>
  )
}
