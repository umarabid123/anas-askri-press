import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { formatPKR } from '@/utils/financial'
import { toast } from '@/stores/toast.store'
import type { Customer } from '@/types'

export interface ReceivePaymentBillInfo {
  saleId: string
  invoiceNumber: string
  total: number
  remainingCredit: number
}

interface ReceivePaymentModalProps {
  isOpen: boolean
  customer?: Customer | null
  billInfo?: ReceivePaymentBillInfo | null
  defaultAmount?: number
  defaultNotes?: string
  onClose: () => void
  onSubmit: (payment: {
    customerId: string
    saleId?: string
    amount: number
    paymentMethod: string
    notes?: string
  }) => Promise<string>
}

export function ReceivePaymentModal({
  isOpen,
  customer,
  billInfo,
  defaultAmount,
  defaultNotes,
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
      const initialAmt =
        defaultAmount !== undefined && defaultAmount > 0
          ? defaultAmount
          : billInfo
          ? billInfo.remainingCredit
          : 0
      setAmount(initialAmt > 0 ? String(initialAmt) : '')
      setPaymentMethod('cash')
      setNotes(defaultNotes || (billInfo ? `Payment for Bill #${billInfo.invoiceNumber}` : ''))
      setError(null)
    }
  }, [isOpen, defaultAmount, defaultNotes, billInfo])

  if (!isOpen || (!customer && !billInfo)) return null

  const numAmount = parseFloat(amount) || 0
  const maxCredit = billInfo ? billInfo.remainingCredit : customer ? customer.balance : 0
  const remainingBillCredit = billInfo ? Math.max(0, billInfo.remainingCredit - numAmount) : 0
  const remainingCustomerBalance = customer ? customer.balance - numAmount : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (numAmount <= 0) {
      setError('Please enter a payment amount greater than zero.')
      return
    }

    if (billInfo && numAmount > billInfo.remainingCredit + 0.01) {
      setError(`Payment amount cannot exceed bill remaining credit (${formatPKR(billInfo.remainingCredit)}).`)
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        customerId: customer?.id || '',
        saleId: billInfo?.saleId,
        amount: numAmount,
        paymentMethod,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not save the payment. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalTitle = billInfo ? `Receive Payment - Bill #${billInfo.invoiceNumber}` : 'Receive Payment'
  const modalDesc = billInfo
    ? `Record payment for Bill #${billInfo.invoiceNumber}${customer ? ` (${customer.name})` : ''}`
    : `Record payment received from ${customer?.name || 'Customer'}.`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      description={modalDesc}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        {/* Balance / Remaining Credit Banner */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">
              {billInfo ? `Bill Unpaid (Udhaar)` : 'Customer Balance (Udhaar)'}
            </p>
            <p
              className={`text-lg font-bold ${
                maxCredit > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {formatPKR(maxCredit)}
            </p>
          </div>
          {numAmount > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">
                {billInfo ? 'Remaining Bill Credit' : 'Balance After Payment'}
              </p>
              <p
                className={`text-lg font-bold ${
                  billInfo
                    ? remainingBillCredit > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                    : remainingCustomerBalance > 0
                    ? 'text-amber-600'
                    : remainingCustomerBalance === 0
                    ? 'text-emerald-600'
                    : 'text-blue-600'
                }`}
              >
                {formatPKR(billInfo ? remainingBillCredit : remainingCustomerBalance)}
              </p>
            </div>
          )}
        </div>

        <Input
          label="Payment Amount (Rs)"
          type="number"
          min="0.01"
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
          placeholder="e.g. Received via Cash / Bank slip # 9210"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  )
}
