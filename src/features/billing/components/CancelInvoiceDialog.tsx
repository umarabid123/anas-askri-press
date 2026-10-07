import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { cancelSale } from '@/services/sqlite.service'
import { toast } from '@/stores/toast.store'
import { formatPKR } from '@/utils/financial'
import type { ShopInvoiceData } from './ShopInvoiceTemplate'

interface CancelInvoiceDialogProps {
  isOpen: boolean
  invoice: ShopInvoiceData
  onClose: () => void
  onCancelled: () => void
}

export function CancelInvoiceDialog({ isOpen, invoice, onClose, onCancelled }: CancelInvoiceDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleConfirm = async () => {
    if (!invoice.saleId) return
    setIsSaving(true); setError('')
    try {
      await cancelSale(invoice.saleId, reason)
      toast.success(`Bill #${invoice.invoiceNumber} cancelled.`)
      setReason('')
      onCancelled()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message); toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => {} : onClose}
      size="md"
      showCloseButton={!isSaving}
      title={`Cancel bill ${invoice.invoiceNumber}?`}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Keep Bill
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} isLoading={isSaving}>
            Cancel Bill
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">The bill stays in history as cancelled. You cannot undo this.</p>
            <ul className="list-disc pl-4 space-y-0.5 text-[13px]">
              <li>Bill total {formatPKR(invoice.total)} is removed from sales and reports.</li>
              {invoice.remainingCredit > 0 && <li>Customer dues go down by {formatPKR(invoice.remainingCredit)}.</li>}
              {invoice.paidAmount > 0 && <li>{formatPKR(invoice.paidAmount)} paid at the sale is recorded as refunded.</li>}
              {(invoice.totalMazdoori || 0) > 0 && <li>This bill's mazdoori is removed from worker dues.</li>}
            </ul>
          </div>
        </div>
        <Textarea
          label="Reason (optional)"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Wrong rate, duplicate bill"
          maxLength={200}
        />
        {error && <p role="alert" className="text-sm text-red-700 bg-red-50 p-2 rounded-lg">{error}</p>}
      </div>
    </Modal>
  )
}
