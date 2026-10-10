import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { customerSchema, type CustomerFormData } from '@/schemas'
import { toast } from '@/stores/toast.store'
import type { Customer } from '@/types'

interface AddCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: CustomerFormData) => Promise<Customer>
}

export function AddCustomerModal({ isOpen, onClose, onAdd }: AddCustomerModalProps) {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [address, setAddress] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [errors, setErrors] = useState<{ name?: string; mobile?: string; openingBalance?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const parsedOpening = openingBalance.trim() === '' ? 0 : parseFloat(openingBalance)
    const validation = customerSchema.safeParse({
      name,
      mobile,
      address,
      openingBalance: isNaN(parsedOpening) ? 0 : parsedOpening,
    })
    if (!validation.success) {
      const fieldErrors: { name?: string; mobile?: string; openingBalance?: string } = {}
      for (const issue of validation.error.issues) {
        if (issue.path[0] === 'name') fieldErrors.name = issue.message
        if (issue.path[0] === 'mobile') fieldErrors.mobile = issue.message
        if (issue.path[0] === 'openingBalance') fieldErrors.openingBalance = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)
    try {
      await onAdd(validation.data)
      toast.success('Customer added.')
      setName('')
      setMobile('')
      setAddress('')
      setOpeningBalance('')
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not add the customer.')
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to add customer',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Customer"
      description="Enter customer details to register their account and track billing history."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
            {errors.general}
          </div>
        )}

        <Input
          label="Customer / Business Name"
          placeholder="e.g. Haji Aslam Iron Works"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoFocus
          required
        />

        <div>
          <Input
            label="Mobile Number"
            placeholder="e.g. 0300 1234567"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            error={errors.mobile}
            required
          />
          <p className="text-[11px] text-slate-400 mt-1">Format: 03001234567 or 0300-1234567</p>
        </div>

        <Textarea
          label="Address / Shop Location (Optional)"
          placeholder="e.g. Shop # 14, Main Loha Market, Rawalpindi"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
        />

        <div>
          <Input
            type="number"
            min="0"
            step="any"
            label="Opening Balance / Previous Udhar (Rs)"
            placeholder="0"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            error={errors.openingBalance}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Previous credit owed by this customer (Purana Udhar/Baqaya). Added to customer's account and included in bill totals.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save Customer
          </Button>
        </div>
      </form>
    </Modal>
  )
}
