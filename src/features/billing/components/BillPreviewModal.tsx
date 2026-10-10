import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { saveFile, openWhatsApp } from '@/services/files.service'
import { printDocument } from '@/utils/printing'
import { toBlob } from 'html-to-image'
import { Ban, Download, MessageCircle, Printer, X, Loader2, Pencil, Plus, DollarSign } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useCartStore } from '@/stores/cart.store'
import { toast } from '@/stores/toast.store'
import { confirmLeaveDraft, startNewBill } from '../bill-actions'
import { Button } from '@/components/ui/Button'
import { ShopInvoiceTemplate, type ShopInvoiceData } from './ShopInvoiceTemplate'
import { CancelInvoiceDialog } from './CancelInvoiceDialog'
import { ReceivePaymentModal } from '@/features/customers/components/ReceivePaymentModal'
import { getBusinessSettings, getSales, getCustomerById, getCustomerLedger, receivePayment } from '@/services/sqlite.service'
import { previousInvoiceBalance } from '../invoice-data'
import type { BusinessSettings, Customer } from '@/types'

interface BillPreviewModalProps {
  isOpen: boolean
  data: ShopInvoiceData | null
  onClose: () => void
  onNewBill: () => void
  // Called after the invoice is cancelled, to reload the list behind the popup
  onCancelled?: () => void
  autoWhatsApp?: boolean
}

const PNG_OPTIONS = { pixelRatio: 3, backgroundColor: '#ffffff', cacheBust: true }

export function BillPreviewModal({
  isOpen,
  data,
  onClose,
  onNewBill,
  onCancelled,
  autoWhatsApp = false,
}: BillPreviewModalProps) {
  const navigate = useNavigate()
  const invoiceRef = useRef<HTMLDivElement>(null)
  const pngCache = useRef<Blob | null>(null)
  const [isGeneratingPng, setIsGeneratingPng] = useState(false)
  const [exportError, updateExportError] = useState('')
  const setExportError = (message: string) => { updateExportError(message); if (message) toast.error(message) }
  const [shareNotice, setShareNotice] = useState('')
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [isOpeningEdit, setIsOpeningEdit] = useState(false)
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false)
  const [receivePaymentCustomer, setReceivePaymentCustomer] = useState<Customer | null>(null)
  const [accountSnapshot, setAccountSnapshot] = useState<{ data: ShopInvoiceData; previousBalance: number } | null>(null)
  const accountReady = !!data && (data.previousBalance !== undefined || (!data.customerId && !data.customer?.id) || accountSnapshot?.data === data)
  const invoiceData = data ? { ...data, previousBalance: data.previousBalance ?? (accountSnapshot?.data === data ? accountSnapshot.previousBalance : 0) } : null

  const hasAutoShared = useRef(false)
  useEffect(() => {
    if (!isOpen) {
      hasAutoShared.current = false
      return
    }
    if (autoWhatsApp && accountReady && !hasAutoShared.current && !isGeneratingPng) {
      hasAutoShared.current = true
      const timer = setTimeout(() => {
        void handleWhatsAppShare()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoWhatsApp, accountReady, isGeneratingPng])

  useEffect(() => {
    if (!isOpen || !data || data.previousBalance !== undefined) return
    const customerId = data.customerId || data.customer?.id
    if (!customerId) return
    let cancelled = false
    getCustomerLedger(customerId).then(ledger => {
      if (!cancelled) setAccountSnapshot({ data, previousBalance: previousInvoiceBalance(data, ledger) })
    }).catch(err => { if (!cancelled) setExportError(err instanceof Error ? err.message : String(err)) })
    return () => { cancelled = true }
  }, [isOpen, data])

  const handleOpenReceivePayment = async () => {
    if (!data) return
    let cust: Customer | null = data.customer || null
    if (!cust) {
      try {
        const sales = await getSales()
        const sale = sales.find((s) => s.id === data.saleId || s.invoiceNumber === data.invoiceNumber)
        if (sale?.customerId) {
          cust = await getCustomerById(sale.customerId)
        }
      } catch (err) {
        console.error(err)
      }
    }
    if (!cust && data.customerName) {
      cust = {
        id: data.customer?.id || '',
        name: data.customerName,
        mobile: data.customerPhone || '',
        address: data.customerAddress || '',
        totalPurchase: data.total,
        totalPaid: data.paidAmount,
        balance: data.remainingCredit || 0,
        createdAt: data.date,
        updatedAt: data.date,
        syncStatus: 'synced',
      }
    }
    if (!cust || !cust.id) {
      toast.error('No customer record attached to this bill.')
      return
    }
    setReceivePaymentCustomer(cust)
    setIsReceivePaymentOpen(true)
  }

  const handleNewBill = () => {
    if (!startNewBill()) return
    onNewBill()
    onClose()
    navigate(ROUTES.NEW_BILL)
  }
  const handleEditBill = async (asNew = false) => {
    if (!data || !confirmLeaveDraft()) return
    setIsOpeningEdit(true); setExportError('')
    try {
      const sale = (await getSales()).find(s => s.id === data.saleId || s.invoiceNumber === data.invoiceNumber)
      if (!sale) throw new Error('Bill not found. Close this window and try again.')
      if (sale.cancelledAt && !asNew) throw new Error('This is an old or cancelled bill. It cannot be edited. Start a New Bill instead.')
      const customer = sale.customerId ? await getCustomerById(sale.customerId) : null
      if (sale.customerId && !customer) throw new Error('The customer record is missing. Restore it before editing this bill.')
      useCartStore.getState().editBill(sale, customer)
      if (asNew) useCartStore.getState().useItemsAsNewBill()
      onClose()
      navigate(ROUTES.NEW_BILL)
    } catch (err) { setExportError(err instanceof Error ? err.message : String(err)) }
    finally { setIsOpeningEdit(false) }
  }

  useEffect(() => {
    if (isOpen) {
      getBusinessSettings().then((res) => {
        if (res) setSettings(res)
      }).catch(console.error)
    }
  }, [isOpen])

  // Pre-render the PNG so the share sheet can open while the click still counts
  // as a user action (browsers reject navigator.share after a slow render).
  useEffect(() => {
    pngCache.current = null
    if (!isOpen || !data || !accountReady) return
    let cancelled = false
    const timer = setTimeout(() => {
      if (!invoiceRef.current) return
      toBlob(invoiceRef.current, PNG_OPTIONS)
        .then((blob) => { if (!cancelled && blob) pngCache.current = blob })
        .catch(() => {})
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [isOpen, data, settings, accountReady, accountSnapshot])

  useEffect(() => {
    if (!isOpen || !invoiceRef.current) return
    const observer = new ResizeObserver(() => { pngCache.current = null })
    observer.observe(invoiceRef.current)
    return () => observer.disconnect()
  }, [isOpen, accountReady])

  if (!isOpen || !data) return null

  const pngFileName = 'ANAS-ARKI-' + data.invoiceNumber + '.png'

  // Render the invoice canvas to a PNG blob
  const generatePngBlob = async (): Promise<Blob> => {
    if (!accountReady) throw new Error('Customer dues are still loading. Please reopen the bill if they do not load.')
    if (pngCache.current) return pngCache.current
    if (!invoiceRef.current) throw new Error('Invoice preview is not ready.')
    const blob = await toBlob(invoiceRef.current, PNG_OPTIONS)
    if (!blob) throw new Error('Could not create the invoice image.')
    pngCache.current = blob
    return blob
  }

  const handleDownloadPng = async (): Promise<boolean> => {
    setIsGeneratingPng(true); setExportError(''); setShareNotice('')
    try {
      const saved = await saveFile(pngFileName, await generatePngBlob())
      if (saved) toast.success('Bill image saved.')
      return saved
    } catch (err) { setExportError(err instanceof Error ? err.message : String(err)); return false }
    finally { setIsGeneratingPng(false) }
  }

  // Handle WhatsApp Share: send the invoice PNG only, no text.
  // WhatsApp links cannot carry attachments. On desktop the image is copied and
  // the customer's chat opens ready for Ctrl+V; on phones (no Ctrl+V) the share
  // sheet hands the image to WhatsApp already attached.
  const handleWhatsAppShare = async () => {
    setExportError(''); setShareNotice('')
    setIsGeneratingPng(true)
    try {
      const image = await generatePngBlob()
      const file = new File([image], pngFileName, { type: 'image/png' })
      const isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      if (isPhone && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
          return
        } catch (err) {
          if (!(err instanceof DOMException) || err.name === 'AbortError') throw err
          // The first render took too long and the tap expired; the image is cached now
          if (err.name === 'NotAllowedError') { setShareNotice('Invoice image is ready. Tap Share on WhatsApp again.'); return }
          throw err
        }
      }

      const phone = (data.customerPhone || data.customer?.mobile || '').replace(/[^0-9]/g, '')
      // Ensure international format (Pakistan: 92300xxxxxxx)
      let formattedPhone = phone
      if (phone.startsWith('0')) {
        formattedPhone = `92${phone.slice(1)}`
      } else if (phone.length === 10 && phone.startsWith('3')) {
        formattedPhone = `92${phone}`
      }

      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })])
      } catch (clipErr) {
        console.warn('Clipboard write warning:', clipErr)
      }

      const shop = settings?.businessName || 'Anas Arki Press & Laser Cutting'
      const invoiceLabel = data.invoiceNumber ? ` #${data.invoiceNumber}` : ''
      const totalLabel = data.total !== undefined ? ` (Total: Rs ${data.total.toLocaleString()})` : ''
      const textMsg = `Assalam-o-Alaikum! Here is your bill${invoiceLabel} from ${shop}${totalLabel}.`

      const waUrl = formattedPhone
        ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(textMsg)}`
        : `https://wa.me/?text=${encodeURIComponent(textMsg)}`

      await openWhatsApp(waUrl)
      setShareNotice('Invoice image copied. In the WhatsApp chat press Ctrl+V, then Send.')
      toast.info('Bill image copied. Paste it into WhatsApp with Ctrl+V.')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setExportError('Could not share the invoice image: ' + (err instanceof Error ? err.message : String(err)) + '. Use Save PNG Image and attach it in WhatsApp.')
    } finally { setIsGeneratingPng(false) }
  }

  // Handle Native Print
  const handlePrint = () => {
    try { printDocument('shop-invoice-canvas', settings?.receiptPaperSize || 'A4') } catch (err) { setExportError(err instanceof Error ? err.message : String(err)) }
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Invoice preview"
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-xs print:p-0 print:bg-white print:static">
      <div className="bg-white sm:rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[96dvh] print:max-w-none print:shadow-none print:max-h-none print:h-auto print:rounded-none">
        {/* Modal Header Bar (Hidden during print) */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-3 border-b border-slate-200 bg-slate-50 print:hidden">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {data.cancelledAt ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  {data.cancelReason?.startsWith('Updated:') ? 'Old Bill' : 'Cancelled Bill'}: {data.invoiceNumber}
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Bill: {data.invoiceNumber}
                </>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {data.cancelledAt
                ? 'This bill cannot be edited. Use its items in a new bill, or start a blank New Bill. ' + (data.cancelReason || '')
                : 'Print, share, or edit this bill. Start another bill with New Bill.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 max-sm:[&>button]:text-xs max-sm:[&>button]:px-2">
            {/* Download PNG Button */}
            <Button
              variant="outline"
              onClick={handleDownloadPng}
              disabled={isGeneratingPng || !accountReady}
              className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              {isGeneratingPng ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <Download className="w-4 h-4 text-blue-600" />
              )}
              <span>{isGeneratingPng ? 'Preparing image...' : 'Save Image'}</span>
            </Button>

            {/* WhatsApp Share Button */}
            <Button
              onClick={handleWhatsAppShare}
              disabled={isGeneratingPng || !accountReady}
              className="bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center gap-2 shadow-xs"
            >
              <MessageCircle className="w-4 h-4 fill-white text-white stroke-none" />
              <span>Share on WhatsApp</span>
            </Button>

            {/* Print Button */}
            <Button
              onClick={handlePrint}
              disabled={!accountReady}
              className="bg-[#002855] hover:bg-[#001e40] text-white flex items-center gap-2 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </Button>

            {/* Close / Next Bill */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors ml-2"
              title="Close Preview"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        </div>

        {exportError && <p role="alert" className="p-3 text-red-700 bg-red-50 print:hidden">{exportError}</p>}
        {shareNotice && <p role="status" className="p-3 text-emerald-800 bg-emerald-50 font-medium print:hidden">{shareNotice}</p>}
        {/* Modal Scrollable Canvas Container */}
        <div className="invoice-preview-body p-2 sm:p-6 bg-slate-100 overflow-auto print:p-0 print:bg-white">
          <div className="invoice-preview-paper print:w-full print:shadow-none">
            {accountReady && invoiceData ? <ShopInvoiceTemplate ref={invoiceRef} data={invoiceData} settings={settings} /> : <p className="p-6 text-slate-600">Loading customer dues…</p>}
          </div>
        </div>

        {/* Modal Footer Controls (Hidden during print) */}
        <div className="invoice-preview-footer flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-3 border-t border-slate-200 bg-white print:hidden">
          <p className="text-xs text-slate-500">
            On mobile, choose WhatsApp from Share. On computer, paste the copied image with Ctrl+V.
          </p>
          <div className="flex flex-wrap items-center gap-2 max-sm:[&>button]:text-xs max-sm:[&>button]:px-2">
            {(() => {
              const isPaid = (data.remainingCredit || 0) <= 0 || !!data.cancelledAt
              return (
                <Button
                  disabled={isPaid}
                  onClick={handleOpenReceivePayment}
                  className={isPaid
                    ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-60 flex items-center gap-1.5 font-semibold'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-semibold shadow-xs'
                  }
                  title={isPaid ? 'Bill is fully paid' : 'Receive Payment'}
                >
                  <DollarSign className="w-4 h-4 stroke-[2.2]" />
                  <span>Receive Payment</span>
                </Button>
              )
            })()}
            {!data.cancelledAt && (
              <Button
                variant="outline"
                onClick={() => handleEditBill()}
                disabled={isOpeningEdit}
                className="flex items-center gap-1.5 bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 font-semibold"
              >
                <Pencil className="w-4 h-4 text-blue-600" />
                {isOpeningEdit ? 'Opening...' : 'Update Bill'}
              </Button>
            )}
            {data.cancelledAt && (
              <Button variant="outline" onClick={() => handleEditBill(true)} disabled={isOpeningEdit}>
                {isOpeningEdit ? 'Opening...' : 'Use Items as New Bill'}
              </Button>
            )}
            {data.saleId && !data.cancelledAt && (
              <Button
                variant="outline"
                onClick={() => setIsCancelOpen(true)}
                className="flex items-center gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
              >
                <Ban className="w-4 h-4" />
                <span>Cancel Bill</span>
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={handleNewBill}
              className="bg-[#1877F2] hover:bg-blue-600 text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> New Bill
            </Button>
          </div>
        </div>
      </div>

      {data.saleId && (
        <CancelInvoiceDialog
          isOpen={isCancelOpen}
          invoice={data}
          onClose={() => setIsCancelOpen(false)}
          onCancelled={() => { setIsCancelOpen(false); onCancelled?.(); onClose() }}
        />
      )}

      {/* Receive Payment Modal */}
      <ReceivePaymentModal
        isOpen={isReceivePaymentOpen}
        customer={receivePaymentCustomer}
        billInfo={
          data
            ? {
                saleId: data.saleId || '',
                invoiceNumber: data.invoiceNumber,
                total: data.total,
                remainingCredit: data.remainingCredit || 0,
              }
            : null
        }
        defaultAmount={data.remainingCredit || 0}
        defaultNotes={`Payment for Bill #${data.invoiceNumber}`}
        onClose={() => {
          setIsReceivePaymentOpen(false)
          setReceivePaymentCustomer(null)
        }}
        onSubmit={async (payment) => {
          const receiptId = await receivePayment({
            ...payment,
            saleId: data.saleId || null,
          })
          toast.success(`Payment of Rs ${payment.amount.toLocaleString()} received for Bill #${data.invoiceNumber}!`)
          setIsReceivePaymentOpen(false)
          setReceivePaymentCustomer(null)
          onCancelled?.()
          onClose()
          return receiptId
        }}
      />
    </div>, document.body
  )
}
