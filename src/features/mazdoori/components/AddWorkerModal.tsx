import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Mazdoor } from '@/types'

interface AddWorkerModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: { name: string; phone?: string }) => Promise<Mazdoor>
}

export function AddWorkerModal({ isOpen, onClose, onAdd }: AddWorkerModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Worker name is required.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onAdd({ name: name.trim(), phone: phone.trim() || undefined })
      setName('')
      setPhone('')
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register worker.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Worker / Partner"
      description="Register a craftsman or partner to track individual labor tasks and ledger payouts."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <Input
          label="Worker / Partner Name"
          placeholder="e.g. Muhammad Aslam or Partner 1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />

        <Input
          label="Phone Number (Optional)"
          placeholder="e.g. 0300 1234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Register Worker
          </Button>
        </div>
      </form>
    </Modal>
  )
}
