import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { customerSchema } from '@/schemas'
import type { Customer } from '@/types'

interface EditCustomerModalProps {
  isOpen: boolean
  customer: Customer | null
  onClose: () => void
  onUpdate: (customer: Customer) => Promise<Customer>
}

export function EditCustomerModal({
  isOpen,
  customer,
  onClose,
  onUpdate,
}: EditCustomerModalProps) {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [address, setAddress] = useState('')
  const [errors, setErrors] = useState<{ name?: string; mobile?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (customer) {
      setName(customer.name)
      setMobile(customer.mobile)
      setAddress(customer.address || '')
      setErrors({})
    }
  }, [customer, isOpen])

  if (!customer) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const validation = customerSchema.safeParse({ name, mobile, address })
    if (!validation.success) {
      const fieldErrors: { name?: string; mobile?: string } = {}
      for (const issue of validation.error.issues) {
        if (issue.path[0] === 'name') fieldErrors.name = issue.message
        if (issue.path[0] === 'mobile') fieldErrors.mobile = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)
    try {
      await onUpdate({
        ...customer,
        name: validation.data.name,
        mobile: validation.data.mobile,
        address: validation.data.address,
      })
      onClose()
    } catch (err: unknown) {
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to update customer',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Customer"
      description={`Update account details for ${customer.name}.`}
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
        />

        <Input
          label="Mobile Number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          error={errors.mobile}
          required
        />

        <Textarea
          label="Address / Shop Location (Optional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
