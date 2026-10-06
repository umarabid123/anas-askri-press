import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Download, MessageCircle, Printer, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ShopInvoiceTemplate, type ShopInvoiceData } from './ShopInvoiceTemplate'
import { getBusinessSettings } from '@/services/sqlite.service'
import { formatDate } from '@/utils/financial'
import type { BusinessSettings } from '@/types'

interface BillPreviewModalProps {
  isOpen: boolean
  data: ShopInvoiceData | null
  onClose: () => void
  onNewBill: () => void
}

export function BillPreviewModal({
  isOpen,
  data,
  onClose,
  onNewBill,
}: BillPreviewModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPng, setIsGeneratingPng] = useState(false)
  const [settings, setSettings] = useState<BusinessSettings | null>(null)

  useEffect(() => {
    if (isOpen) {
      getBusinessSettings().then((res) => {
        if (res) setSettings(res)
      }).catch(console.error)
    }
  }, [isOpen])

  if (!isOpen || !data) return null

  // Generate PNG Data URL
  const generatePngDataUrl = async (): Promise<string | null> => {
    if (!invoiceRef.current) return null
    try {
      const dataUrl = await toPng(invoiceRef.current, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
      })
      return dataUrl
    } catch (err) {
      console.error('Failed to generate PNG image:', err)
      return null
    }
  }

  // Handle Download PNG
  const handleDownloadPng = async () => {
    setIsGeneratingPng(true)
    try {
      const dataUrl = await generatePngDataUrl()
      if (dataUrl) {
        const link = document.createElement('a')
        link.download = `ANAS-ARKI-${data.invoiceNumber || 'INVOICE'}.png`
        link.href = dataUrl
        link.click()
      }
    } finally {
      setIsGeneratingPng(false)
    }
  }

  // Handle WhatsApp Share
  const handleWhatsAppShare = async () => {
    // 1. Download PNG so operator has the image ready to attach
    handleDownloadPng()

    // 2. Prepare text message
    const phone = (data.customerPhone || data.customer?.mobile || '').replace(/[^0-9]/g, '')
    // Ensure international format (Pakistan: 92300xxxxxxx)
    const formattedPhone = phone.startsWith('0') ? `92${phone.slice(1)}` : phone

    const message = [
      `*ANAS ARKI PRESS & LASER CUTTING*`,
      `📄 Invoice #: ${data.invoiceNumber}`,
      `📅 Date: ${formatDate(data.date)}`,
      `👤 Customer: ${data.customerName || data.customer?.name || 'Valued Customer'}`,
      `💰 Total: Rs ${data.total.toLocaleString()}`,
      `💵 Paid: Rs ${data.paidAmount.toLocaleString()}`,
      data.remainingCredit > 0 ? `⚠️ Balance: Rs ${data.remainingCredit.toLocaleString()}` : '✅ Fully Paid',
      `\nThank you for choosing Anas Arki Press & Laser Cutting!`,
    ].join('\n')

    const url = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`

    window.open(url, '_blank')
  }

  // Handle Native Print
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden max-h-[96vh] print:max-w-none print:shadow-none print:max-h-none print:rounded-none">
        {/* Modal Header Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Invoice Created: {data.invoiceNumber}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review invoice, save PNG image, share with customer, or print thermal/sheet receipt.
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

        {/* Modal Scrollable Canvas Container */}
        <div className="p-6 bg-slate-100 overflow-auto flex justify-center print:p-0 print:bg-white">
          <div className="bg-white shadow-lg print:shadow-none">
            <ShopInvoiceTemplate ref={invoiceRef} data={data} settings={settings} />
          </div>
        </div>

        {/* Modal Footer Controls (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white print:hidden">
          <p className="text-xs text-slate-500">
            Image rendered in exact shop letterhead proportion with 2.5x high-definition clarity.
          </p>
          <div className="flex items-center gap-3">
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
    </div>
  )
}
