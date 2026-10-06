import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { saveFile, openWhatsApp } from '@/services/files.service'
import { printDocument } from '@/utils/printing'
import { toBlob } from 'html-to-image'
import { Ban, Download, MessageCircle, Printer, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ShopInvoiceTemplate, type ShopInvoiceData } from './ShopInvoiceTemplate'
import { CancelInvoiceDialog } from './CancelInvoiceDialog'
import { getBusinessSettings } from '@/services/sqlite.service'
import type { BusinessSettings } from '@/types'

interface BillPreviewModalProps {
  isOpen: boolean
  data: ShopInvoiceData | null
  onClose: () => void
  onNewBill: () => void
  // Called after the invoice is cancelled, to reload the list behind the popup
  onCancelled?: () => void
}

const PNG_OPTIONS = { pixelRatio: 2.5, backgroundColor: '#ffffff', cacheBust: true }

export function BillPreviewModal({
  isOpen,
  data,
  onClose,
  onNewBill,
  onCancelled,
}: BillPreviewModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const pngCache = useRef<Blob | null>(null)
  const [isGeneratingPng, setIsGeneratingPng] = useState(false)
  const [exportError, setExportError] = useState('')
  const [shareNotice, setShareNotice] = useState('')
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [isCancelOpen, setIsCancelOpen] = useState(false)

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
    if (!isOpen || !data) return
    let cancelled = false
    const timer = setTimeout(() => {
      if (!invoiceRef.current) return
      toBlob(invoiceRef.current, PNG_OPTIONS)
        .then((blob) => { if (!cancelled && blob) pngCache.current = blob })
        .catch(() => {})
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [isOpen, data, settings])

  if (!isOpen || !data) return null

  const pngFileName = 'ANAS-ARKI-' + data.invoiceNumber + '.png'

  // Render the invoice canvas to a PNG blob
  const generatePngBlob = async (): Promise<Blob> => {
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
      return await saveFile(pngFileName, await generatePngBlob())
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
      const formattedPhone = phone.startsWith('0') ? `92${phone.slice(1)}` : phone
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })])
      await openWhatsApp(`https://wa.me/${formattedPhone}`)
      setShareNotice('Invoice image copied. In the WhatsApp chat press Ctrl+V, then Send.')
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
    <div role="dialog" aria-modal="true" aria-label="Invoice preview" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden max-h-[96vh] print:max-w-none print:shadow-none print:max-h-none print:rounded-none">
        {/* Modal Header Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {data.cancelledAt ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  Invoice Cancelled: {data.invoiceNumber}
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  {data.saleId ? 'Invoice' : 'Invoice Created'}: {data.invoiceNumber}
                </>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {data.cancelledAt
                ? 'Kept for history only. Reason: ' + (data.cancelReason || 'not given')
                : 'Review invoice, save PNG image, share with customer, or print thermal/sheet receipt.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Download PNG Button */}
            <Button
              variant="outline"
              onClick={handleDownloadPng}
              disabled={isGeneratingPng}
              className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              {isGeneratingPng ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <Download className="w-4 h-4 text-blue-600" />
              )}
              <span>{isGeneratingPng ? 'Generating PNG...' : 'Save PNG Image'}</span>
            </Button>

            {/* WhatsApp Share Button */}
            <Button
              onClick={handleWhatsAppShare}
              disabled={isGeneratingPng}
              className="bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center gap-2 shadow-xs"
            >
              <MessageCircle className="w-4 h-4 fill-white text-white stroke-none" />
              <span>Share on WhatsApp</span>
            </Button>

            {/* Print Button */}
            <Button
              onClick={handlePrint}
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
        <div className="p-6 bg-slate-100 overflow-auto flex justify-center print:p-0 print:bg-white">
          <div className="bg-white shadow-lg print:shadow-none">
            <ShopInvoiceTemplate ref={invoiceRef} data={data} settings={settings} />
          </div>
        </div>

        {/* Modal Footer Controls (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white print:hidden">
          <p className="text-xs text-slate-500">
            WhatsApp shares the invoice image only. Paste it in the chat with Ctrl+V, then Send.
          </p>
          <div className="flex items-center gap-3">
            {data.saleId && !data.cancelledAt && (
              <Button
                variant="outline"
                onClick={() => setIsCancelOpen(true)}
                className="flex items-center gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
              >
                <Ban className="w-4 h-4" />
                <span>Cancel Invoice</span>
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={onNewBill}
              className="bg-[#1877F2] hover:bg-blue-600 text-white"
            >
              Create Another Bill
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
    </div>, document.body
  )
}
