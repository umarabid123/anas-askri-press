import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { formatPKR } from '@/utils/financial'
import { toast } from '@/stores/toast.store'
import type { Customer } from '@/types'

interface ReceivePaymentModalProps {
  isOpen: boolean
  customer: Customer | null
  onClose: () => void
  onSubmit: (payment: {
    customerId: string
    amount: number
    paymentMethod: string
    notes?: string
  }) => Promise<string>
}

export function ReceivePaymentModal({
  isOpen,
  customer,
  onClose,
  onSubmit,
}: ReceivePaymentModalProps) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setAmount('')
      setPaymentMethod('cash')
      setNotes('')
      setError(null)
    }
  }, [isOpen])

  if (!customer) return null

  const numAmount = parseFloat(amount) || 0
  const remainingBalance = customer.balance - numAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (numAmount <= 0) {
      setError('Please enter a payment amount greater than zero.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        customerId: customer.id,
        amount: numAmount,
        paymentMethod,
        notes: notes.trim() || undefined,
      })
      toast.success('Payment received and saved.')
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not save the payment. Please try again.'
      setError(message); toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receive Payment"
      description={`Record payment received from ${customer.name}.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        {/* Customer Balance Banner */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Amount Unpaid (Udhaar)</p>
            <p
              className={`text-lg font-bold ${
                customer.balance > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {formatPKR(customer.balance)}
            </p>
          </div>
          {numAmount > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">Balance After Payment</p>
              <p
                className={`text-lg font-bold ${
                  remainingBalance > 0
                    ? 'text-amber-600'
                    : remainingBalance === 0
                    ? 'text-emerald-600'
                    : 'text-blue-600'
                }`}
              >
                {formatPKR(remainingBalance)}
              </p>
            </div>
          )}
        </div>

        <Input
          label="Payment Amount (Rs)"
          type="number"
          min="1"
          step="any"
          placeholder="Enter amount in PKR"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          required
        />

        <Select
          label="Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank')}
          options={[
            { value: 'cash', label: 'Cash Payment' },
            { value: 'bank', label: 'Bank Transfer / Online' },
          ]}
        />

        <Textarea
          label="Notes / Receipt Reference (Optional)"
          placeholder="e.g. Received via JazzCash / Bank slip # 9210"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  )
}
