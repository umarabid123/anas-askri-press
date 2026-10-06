import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { formatPKR } from '@/utils/financial'
import type { Mazdoor } from '@/types'

interface PayWorkerModalProps {
  isOpen: boolean
  worker: Mazdoor | null
  onClose: () => void
  onSubmit: (payment: { mazdoorId: string; amount: number; notes?: string }) => Promise<boolean>
}

export function PayWorkerModal({
  isOpen,
  worker,
  onClose,
  onSubmit,
}: PayWorkerModalProps) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setAmount('')
      setNotes('')
      setError(null)
    }
  }, [isOpen])

  if (!worker) return null

  const numAmount = parseFloat(amount) || 0
  const remainingBalance = worker.balance - numAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (numAmount <= 0) {
      setError('Please enter a payout amount greater than zero.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        mazdoorId: worker.id,
        amount: numAmount,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record payout.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Worker Payout"
      description={`Record payment or cash advance paid to ${worker.name}.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        {/* Worker Balance Box */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Current Balance Owed</p>
            <p
              className={`text-lg font-bold ${
                worker.balance > 0 ? 'text-purple-700' : 'text-slate-900'
              }`}
            >
              {formatPKR(worker.balance)}
            </p>
          </div>
          {numAmount > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">Balance After Payout</p>
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
          label="Payout Amount (Rs)"
          type="number"
          min="1"
          step="any"
          placeholder="Enter payout amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          required
        />

        <Textarea
          label="Notes / Reason (Optional)"
          placeholder="e.g. Weekly settlement / Cash advance"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Confirm Payout
          </Button>
        </div>
      </form>
    </Modal>
  )
}
