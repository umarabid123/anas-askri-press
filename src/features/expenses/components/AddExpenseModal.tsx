import { useState } from 'react'
import { Banknote, Landmark } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, CurrencyInput } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createExpense } from '@/services/sqlite.service'
import { localDateKey } from '@/utils/financial'
import { cn } from '@/utils/cn'
import { EXPENSE_CATEGORIES } from '../categories'
import type { Expense } from '@/types'

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onAdded: (expense: Expense) => void
}

export function AddExpenseModal({ isOpen, onClose, onAdded }: AddExpenseModalProps) {
  const [expenseDate, setExpenseDate] = useState(localDateKey())
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true); setError('')
    try {
      const expense = await createExpense({ expenseDate, category, description, amount: Number(amount), paymentMethod })
      onAdded(expense)
      setDescription(''); setAmount('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Expense"
      description="Shop spending such as bijli, kiraya or chadar purchase"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" required value={expenseDate} max={localDateKey()} onChange={(e) => setExpenseDate(e.target.value)} />
          <CurrencyInput label="Amount" required autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>
        <Select
          label="Category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <Input label="Details (optional)" value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. October electricity bill" />

        <div>
          <p className="block text-xs font-semibold text-slate-700 mb-1">Paid By</p>
          <div className="grid grid-cols-2 gap-2">
            {([['cash', 'Cash', Banknote], ['bank', 'Bank', Landmark]] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPaymentMethod(value)}
                className={cn(
                  'h-9 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                  paymentMethod === value ? 'bg-[#1877F2] border-[#1877F2] text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-red-700 bg-red-50 p-2 rounded-lg">{error}</p>}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" isLoading={isSaving}>Save Expense</Button>
        </div>
      </form>
    </Modal>
  )
}
