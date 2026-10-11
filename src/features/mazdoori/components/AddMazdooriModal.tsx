import { useState, useEffect } from 'react'
import { Plus, Minus, X, Receipt, User, Scale, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatPKR, localDateKey } from '@/utils/financial'
import { getCustomers, createDirectMazdooriEntry } from '@/services/sqlite.service'
import { toast } from '@/stores/toast.store'
import type { Customer } from '@/types'

interface AddMazdooriModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddMazdooriModal({ isOpen, onClose, onSuccess }: AddMazdooriModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [mode, setMode] = useState<'add' | 'minus'>('add')

  // Customer selection (optional)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customCustomerName, setCustomCustomerName] = useState<string>('')
  const [isTypingCustomName, setIsTypingCustomName] = useState<boolean>(false)

  // Form Fields
  const [amount, setAmount] = useState<string>('')
  const [workDate, setWorkDate] = useState(localDateKey())
  const [itemName, setItemName] = useState<string>('')
  const [weight, setWeight] = useState<string>('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      getCustomers()
        .then(setCustomers)
        .catch(() => {})
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setSelectedCustomerId('')
    setCustomCustomerName('')
    setIsTypingCustomName(false)
    setAmount('')
    setWorkDate(localDateKey())
    setItemName('')
    setWeight('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsedAmount = parseFloat(amount) || 0
    if (parsedAmount <= 0) {
      setError('Please enter an amount greater than zero.')
      return
    }

    const parsedWeight = parseFloat(weight) || 0

    setIsSubmitting(true)

    try {
      const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)
      const customerName = isTypingCustomName
        ? customCustomerName.trim() || undefined
        : selectedCustomer?.name || undefined
      const customerId = isTypingCustomName ? undefined : selectedCustomer?.id || undefined
      const customerMobile = isTypingCustomName ? undefined : selectedCustomer?.mobile || undefined

      const invoiceNumber = await createDirectMazdooriEntry({
        customerId,
        customerName,
        customerMobile,
        amount: parsedAmount,
        isDeduction: mode === 'minus',
        itemName: itemName.trim() || undefined,
        weight: parsedWeight > 0 ? parsedWeight : undefined,
        date: workDate,
      })

      const formatted = formatPKR(parsedAmount)
      const custText = customerName ? ` for ${customerName}` : ''
      if (mode === 'add') {
        toast.success(`Added ${formatted} Mazdoori${custText} (Ref: ${invoiceNumber})`)
      } else {
        toast.success(`Deducted ${formatted} Mazdoori${custText} (Ref: ${invoiceNumber})`)
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const numAmount = parseFloat(amount) || 0
  const numWeight = parseFloat(weight) || 0
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Receipt className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Mazdoori Entry</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Add labor charges (+) or minus / deduct mazdoori (-)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-2 bg-slate-100 border-b border-slate-200 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('add')
              setError(null)
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'add'
                ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span>Add Mazdoori (+)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('minus')
              setError(null)
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'minus'
                ? 'bg-white text-red-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Minus className="w-4 h-4 text-red-600 stroke-[2.5]" />
            <span>Minus Mazdoori (-)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* User-friendly Customer Selection (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Customer Name <span className="text-slate-400 font-normal">(Optional)</span></span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setIsTypingCustomName(!isTypingCustomName)
                  setSelectedCustomerId('')
                  setCustomCustomerName('')
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                {isTypingCustomName ? '← Select from Customer List' : '+ Enter Name Manually'}
              </button>
            </div>

            {isTypingCustomName ? (
              <Input
                placeholder="Enter customer name (optional)"
                value={customCustomerName}
                onChange={(e) => setCustomCustomerName(e.target.value)}
                className="h-10 text-sm"
              />
            ) : (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Walk-in Customer (Cash)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.mobile ? `· ${c.mobile}` : ''}
                  </option>
                ))}
              </select>
            )}

            <p className="text-[11px] text-slate-500">
              {isTypingCustomName
                ? customCustomerName.trim()
                  ? `This record will be saved for "${customCustomerName.trim()}".`
                  : 'Leave empty for a standard walk-in cash transaction.'
                : selectedCustomer
                ? `Customer: ${selectedCustomer.name}`
                : 'Select a customer or leave as walk-in cash customer.'}
            </p>
          </div>

          {/* Amount and Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {mode === 'add' ? 'Mazdoori Amount (+)' : 'Minus Amount (-)'} (Rs)
              </label>
              <Input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Date</label>
              <Input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Item Name and Weight Row (Replacing Work Details and Notes) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-500" />
                <span>Item Name <span className="text-slate-400 font-normal">(Optional)</span></span>
              </label>
              <Input
                placeholder="e.g. Chadar / Pressing"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                <span>Weight (kg) <span className="text-slate-400 font-normal">(Optional)</span></span>
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 25.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          {/* Visual Summary Card */}
          {numAmount > 0 && (
            <div
              className={`p-3 rounded-xl border text-xs flex justify-between items-center transition-all ${
                mode === 'add'
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                  : 'bg-red-50/80 border-red-200 text-red-800'
              }`}
            >
              <div>
                <span className="font-medium">
                  {mode === 'add' ? 'Mazdoori Addition:' : 'Mazdoori Deduction:'}
                </span>
                {numWeight > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-black/5 text-[11px] font-semibold">
                    Weight: {numWeight.toLocaleString()} kg
                  </span>
                )}
              </div>
              <span className="font-bold text-sm">
                {mode === 'add' ? `+${formatPKR(numAmount)}` : `-${formatPKR(numAmount)}`}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-1.5 text-white ${
                mode === 'add'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {mode === 'add' ? (
                <Plus className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Minus className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>{mode === 'add' ? 'Add Mazdoori' : 'Minus Mazdoori'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
