import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import type { Mazdoor, MazdooriEntry } from '@/types'

interface AddMazdooriEntryModalProps {
  isOpen: boolean
  workers: Mazdoor[]
  preselectedWorkerId?: string
  onClose: () => void
  onSubmit: (entry: {
    mazdoorId: string
    mazdoorName: string
    workDate: string
    workDetail: string
    amount: number
    paidAmount: number
    notes?: string
  }) => Promise<MazdooriEntry>
}

export function AddMazdooriEntryModal({
  isOpen,
  workers,
  preselectedWorkerId,
  onClose,
  onSubmit,
}: AddMazdooriEntryModalProps) {
  const [workerId, setWorkerId] = useState(preselectedWorkerId || '')
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10))
  const [workDetail, setWorkDetail] = useState('')
  const [amount, setAmount] = useState('')
  const [paidAmount, setPaidAmount] = useState('0')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setWorkerId(preselectedWorkerId || (workers[0]?.id ?? ''))
      setWorkDate(new Date().toISOString().slice(0, 10))
      setWorkDetail('')
      setAmount('')
      setPaidAmount('0')
      setNotes('')
      setError(null)
    }
  }, [isOpen, preselectedWorkerId, workers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const selectedWorker = workers.find((w) => w.id === workerId)
    if (!selectedWorker) {
      setError('Please select a worker.')
      return
    }

    if (!workDetail.trim()) {
      setError('Work detail is required.')
      return
    }

    const numAmount = parseFloat(amount) || 0
    if (numAmount <= 0) {
      setError('Labor amount must be greater than zero.')
      return
    }

    const numPaid = parseFloat(paidAmount) || 0

    setIsSubmitting(true)
    try {
      await onSubmit({
        mazdoorId: selectedWorker.id,
        mazdoorName: selectedWorker.name,
        workDate,
        workDetail: workDetail.trim(),
        amount: numAmount,
        paidAmount: numPaid,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add labor entry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Manual Mazdoori Entry"
      description="Record workshop labor or partner task done outside of automatic invoice billing."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <Select
          label="Worker / Partner"
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          options={workers.map((w) => ({ value: w.id, label: `${w.name} (Bal: Rs ${w.balance.toLocaleString()})` }))}
          required
        />

        <Input
          label="Work Date"
          type="date"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
          required
        />

        <Input
          label="Work Detail / Task Description"
          placeholder="e.g. CNC sheet cutting 10 gauges, welding frame"
          value={workDetail}
          onChange={(e) => setWorkDetail(e.target.value)}
          autoFocus
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Labor Amount (Rs)"
            type="number"
            min="1"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Input
            label="Advance / Paid Amount (Rs)"
            type="number"
            min="0"
            placeholder="0"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
          />
        </div>

        <Textarea
          label="Notes (Optional)"
          placeholder="e.g. Job done for shop stock"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white">
            Record Labor Entry
          </Button>
        </div>
      </form>
    </Modal>
  )
}
