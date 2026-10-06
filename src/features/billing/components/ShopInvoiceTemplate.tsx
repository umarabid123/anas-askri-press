import React from 'react'
import type { Customer, SaleItem, BusinessSettings } from '@/types'
import { parseDate } from '@/utils/financial'

export interface ShopInvoiceData {
  invoiceNumber: string
  date: string
  customer?: Customer | null
  customerName?: string
  customerPhone?: string
  customerAddress?: string
  items: SaleItem[]
  subtotal: number
  totalMazdoori?: number
  discount: number
  total: number
  paidAmount: number
  remainingCredit: number
  paymentMethod: string
  // Set when showing a saved invoice, so it can be cancelled
  saleId?: string
  cancelledAt?: string | null
  cancelReason?: string | null
}

interface ShopInvoiceTemplateProps {
  data: ShopInvoiceData
  settings?: BusinessSettings | null
  id?: string
}

export const ShopInvoiceTemplate = React.forwardRef<HTMLDivElement, ShopInvoiceTemplateProps>(
  ({ data, settings, id = 'shop-invoice-canvas' }, ref) => {
    // Fill up to at least 6 rows so it matches the reference template layout exactly
    const minRows = 6
    const filledItems = [...data.items]
    const emptyRowsCount = Math.max(0, minRows - filledItems.length)

    const rawShopName = settings?.businessName || 'ANAS ARKI PRESS & LASER CUTTING'
    let primaryName = 'ANAS ARKI'
    let secondaryName = 'PRESS & LASER CUTTING'
    if (rawShopName.includes('&')) {
      const parts = rawShopName.split('&')
      primaryName = parts[0].trim()
      secondaryName = `& ${parts.slice(1).join('&').trim()}`
    } else if (rawShopName.includes(' ')) {
      const words = rawShopName.split(' ')
      if (words.length > 2) {
        primaryName = words.slice(0, 2).join(' ')
        secondaryName = words.slice(2).join(' ')
      } else {
        primaryName = rawShopName
        secondaryName = ''
      }
    } else {
      primaryName = rawShopName
      secondaryName = ''
    }

    const tagline = settings?.subtitle || 'PRECISION | QUALITY | YOUR VISION OUR WORK'
    const address = settings?.address || 'Dhuddi wala Lower Canal Near Askari Bandk Main Jaranwala Road'
    const phone = settings?.phone || '0300-7973059'
    const footerText = settings?.footerText || 'Thank You For Your Business'

    // Formatted date (DD-MM-YYYY)
    const formattedDate = (() => {
      try {
        const d = parseDate(data.date)
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}-${month}-${year}`
      } catch {
        return data.date || ''
      }
    })()

    const customerName = data.customer?.name || data.customerName || ''
    const customerPhone = data.customer?.mobile || data.customerPhone || ''
    const customerAddress = data.customer?.address || data.customerAddress || ''

    if (settings && settings.receiptPaperSize !== 'A4') return (
      <div id={id} ref={ref} className="bg-white p-3 text-black font-sans select-text" style={{ width: settings.receiptPaperSize, fontSize: settings.receiptPaperSize === '58mm' ? 10 : 12 }}>
        <div className="text-center border-b border-black pb-2"><h1 className="font-bold text-sm">{rawShopName}</h1><p>{address}</p><p>{phone}</p></div>
        <p className="font-bold mt-2">Invoice {data.invoiceNumber}</p><p>{formattedDate} · {data.paymentMethod.toUpperCase()}</p>
        {data.cancelledAt && <p className="text-center font-bold border border-black my-1">*** CANCELLED ***</p>}
        <p>{customerName || 'Cash Customer'} {customerPhone}</p>
        {customerAddress && <p>{customerAddress}</p>}
        <div className="border-y border-dashed border-black my-2 py-2">
          {data.items.map((item, index) => <div key={item.id || index} className="mb-2">
            <p className="font-semibold break-words">{index + 1}. {item.itemName}</p>
            <div className="flex justify-between gap-2"><span>{item.quantity} × {item.rate.toLocaleString()} + labour {item.mazdoori.toLocaleString()}</span><b>{item.amount.toLocaleString()}</b></div>
            {(item.mazdooriTasks || []).map(task => <p key={task.id}>{task.title}{task.workerName ? ' · ' + task.workerName : ''}: {task.amount.toLocaleString()}</p>)}
          </div>)}
        </div>
        {[['Goods', data.subtotal], ['Labour', data.totalMazdoori || 0], ['Discount', data.discount], ['TOTAL', data.total], ['Paid', data.paidAmount], ['Balance', data.remainingCredit]].map(([label, amount]) => <div key={label} className="flex justify-between gap-2"><span>{label}</span><b>{Number(amount).toLocaleString('en-PK', { maximumFractionDigits: 2 })}</b></div>)}
        <p className="text-center mt-3 border-t border-black pt-2">{footerText}</p>
      </div>
    )

    return (
      <div
        id={id}
        ref={ref}
        className="w-[950px] min-h-[620px] bg-white text-slate-900 relative p-8 font-sans overflow-hidden select-none border border-slate-300 shadow-sm print:shadow-none print:border-none print:w-full print:p-4"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Cancelled stamp, so a shared or printed copy cannot pass as valid */}
        {data.cancelledAt && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="border-[6px] border-red-600/80 text-red-600/80 font-black text-7xl tracking-widest px-10 py-3 rounded-xl -rotate-12">
              CANCELLED
            </div>
          </div>
        )}

        {/* Top-Left Corner Geometric Banner */}
        <div className="absolute top-0 left-0 w-44 h-14 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 180 60" className="w-full h-full">
            <polygon points="0,0 180,0 120,60 0,60" fill="#E5A93C" />
            <polygon points="0,0 140,0 80,60 0,60" fill="#002855" />
          </svg>
        </div>

        {/* Top-Right Corner Geometric Banner */}
        <div className="absolute top-0 right-0 w-44 h-14 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 180 60" className="w-full h-full">
            <polygon points="0,0 180,0 180,60 60,0" fill="#002855" />
            <polygon points="40,0 180,0 180,60 100,60" fill="#E5A93C" />
          </svg>
        </div>

        {/* ===================== HEADER SECTION ===================== */}
        <div className="flex items-start justify-between gap-4 pt-1 pb-4">
          {/* Logo & Company Name */}
          <div className="flex items-center gap-3.5 pl-6">
            {/* AA Stylized Vector Logo */}
            <div className="w-20 h-20 shrink-0 relative flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-sm">
                {/* Golden background 'A' */}
                <path
                  d="M48 95 L82 22 L116 95 L95 95 L82 66 L68 95 Z"
                  fill="#E5A93C"
                />
                <polygon points="82,42 90,60 74,60" fill="#FFFFFF" />
                {/* Foreground Navy 'A' */}
                <path
                  d="M12 95 L46 22 L80 95 L59 95 L46 66 L33 95 Z"
                  fill="#002855"
                />
                <polygon points="46,42 54,60 38,60" fill="#FFFFFF" />
                {/* Crossbar stylized spark */}
                <circle cx="82" cy="92" r="5" fill="#E5A93C" />
                {/* Starburst rays */}
                <g stroke="#E5A93C" strokeWidth="2">
                  <line x1="82" y1="80" x2="82" y2="104" />
                  <line x1="70" y1="92" x2="94" y2="92" />
                  <line x1="73" y1="83" x2="91" y2="101" />
                  <line x1="73" y1="101" x2="91" y2="83" />
                </g>
              </svg>
            </div>

            {/* Typography */}
            <div>
              <h1 className="text-[32px] font-black tracking-tight leading-none text-[#002855]">
                {primaryName}
              </h1>
              {secondaryName ? (
                <h2 className="text-[17px] font-extrabold tracking-wide text-[#E5A93C] mt-1 leading-tight uppercase">
                  {secondaryName}
                </h2>
              ) : null}
              <p className="text-[9.5px] font-bold tracking-wider text-[#002855] mt-1.5 uppercase">
                {tagline}
              </p>
            </div>
          </div>

          {/* Center Services Column */}
          <div className="flex flex-col gap-1.5 text-[11px] font-bold text-slate-800 self-center border-l border-slate-200 pl-4">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#E5A93C] text-white flex items-center justify-center text-[10px]">
                ⚡
              </span>
              <span>Laser Cutting</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#E5A93C] text-white flex items-center justify-center text-[10px]">
                ⚙️
              </span>
              <span>CNC Cutting</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#E5A93C] text-white flex items-center justify-center text-[10px]">
                🔧
              </span>
              <span>Metal Fabrication</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#E5A93C] text-white flex items-center justify-center text-[10px]">
                🖨️
              </span>
              <span>Custom Design & Printing</span>
            </div>
          </div>

          {/* Right Contact Details Column */}
          <div className="flex flex-col gap-2 text-[11px] text-slate-800 pr-6 max-w-[260px]">
            <div className="flex items-start gap-2">
              <span className="text-[#002855] text-sm leading-none shrink-0 mt-0.5">📍</span>
              <span className="font-semibold leading-tight text-slate-800">
                {address}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#002855] text-sm leading-none shrink-0">📞</span>
              <span className="font-bold text-[#002855] text-[13px] tracking-wide">
                {phone}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#002855] text-sm leading-none shrink-0">✉️</span>
              <span className="font-semibold text-slate-700 text-[10.5px]">
                barkatarkipress@outlook.com
              </span>
            </div>
          </div>
        </div>

        {/* Golden Horizontal Separator Line */}
        <div className="relative my-1">
          <div className="h-[2px] bg-[#E5A93C] w-full" />
        </div>

        {/* Center INVOICE Banner */}
        <div className="flex justify-center -mt-3.5 mb-2 relative z-10">
          <div
            className="bg-[#002855] text-white px-12 py-1.5 text-center font-black tracking-widest text-[16px] uppercase shadow-sm border-y-2 border-[#E5A93C]"
            style={{
              clipPath: 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0% 50%)',
            }}
          >
            INVOICE
          </div>
        </div>

        {/* ===================== CUSTOMER & INVOICE META ===================== */}
        <div className="grid grid-cols-12 gap-5 mb-4">
          {/* Customer Details Box (7 cols) */}
          <div className="col-span-7 border-2 border-[#002855] rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-[#002855] text-white px-3.5 py-1 text-xs font-bold flex items-center gap-1.5">
              <span>👤</span>
              <span>Customer Details</span>
            </div>
            <div className="p-2.5 text-xs space-y-1.5 text-slate-900">
              <div className="flex items-center">
                <span className="w-16 font-bold text-slate-800">Name</span>
                <span className="mr-1.5 font-bold">:</span>
                <span className="flex-1 font-semibold text-slate-900 border-b border-dotted border-slate-300 pb-0.5 min-h-[18px]">
                  {customerName}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-16 font-bold text-slate-800">Address</span>
                <span className="mr-1.5 font-bold">:</span>
                <span className="flex-1 text-slate-800 border-b border-dotted border-slate-300 pb-0.5 min-h-[18px]">
                  {customerAddress}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-16 font-bold text-slate-800">Phone</span>
                <span className="mr-1.5 font-bold">:</span>
                <span className="flex-1 font-semibold text-slate-900 border-b border-dotted border-slate-300 pb-0.5 min-h-[18px]">
                  {customerPhone}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Meta Box (5 cols) */}
          <div className="col-span-5 border-2 border-[#002855] rounded-xl p-3 bg-white flex flex-col justify-center text-xs space-y-2 text-slate-900 shadow-2xs">
            <div className="flex items-center">
              <span className="w-28 font-bold text-slate-800 flex items-center gap-1.5">
                <span>📄</span>
                <span>Invoice No</span>
              </span>
              <span className="mr-2 font-bold">:</span>
              <span className="font-extrabold text-[#002855] text-sm">
                {data.invoiceNumber || 'ARKI-1001'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-28 font-bold text-slate-800 flex items-center gap-1.5">
                <span>📅</span>
                <span>Date</span>
              </span>
              <span className="mr-2 font-bold">:</span>
              <span className="font-semibold text-slate-900">
                {formattedDate}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-28 font-bold text-slate-800 flex items-center gap-1.5">
                <span>💳</span>
                <span>Payment Type</span>
              </span>
              <span className="mr-2 font-bold">:</span>
              <span className="font-semibold text-slate-900 capitalize">
                {data.paymentMethod === 'bank' ? 'Bank Transfer' : 'Cash'}
              </span>
            </div>
          </div>
        </div>

        {/* ===================== ITEMS TABLE ===================== */}
        <div className="border-2 border-[#002855] rounded-xl overflow-hidden mb-4 bg-white shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#002855] text-white font-bold text-[12px]">
                <th className="py-2 px-3 w-12 text-center border-r border-blue-900">Sr.</th>
                <th className="py-2 px-3 border-r border-blue-900">Description</th>
                <th className="py-2 px-3 w-16 text-center border-r border-blue-900">Qty</th>
                <th className="py-2 px-3 w-28 text-center border-r border-blue-900">Rate (Rs.)</th>
                <th className="py-2 px-3 w-28 text-center border-r border-blue-900">Mazdoori (Rs.)</th>
                <th className="py-2 px-3 w-32 text-right">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filledItems.map((item, index) => (
                <tr key={item.id || index} className="h-8 hover:bg-slate-50/50">
                  <td className="py-1.5 px-3 text-center font-bold text-slate-700 border-r border-slate-200">
                    {index + 1}
                  </td>
                  <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                    <div>{item.itemName}</div>
                    {item.mazdooriTasks && item.mazdooriTasks.length > 0 && (
                      <div className="text-[10px] text-purple-700 font-normal">
                        Labor: {item.mazdooriTasks.map((t) => `${t.title}${t.workerName ? ` (${t.workerName})` : ''}`).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 px-3 text-center font-semibold text-slate-800 border-r border-slate-200">
                    {item.quantity}
                  </td>
                  <td className="py-1.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200">
                    {item.rate > 0 ? item.rate.toLocaleString() : '-'}
                  </td>
                  <td className="py-1.5 px-3 text-center font-semibold text-purple-800 border-r border-slate-200">
                    {item.mazdoori > 0 ? item.mazdoori.toLocaleString() : '-'}
                  </td>
                  <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                    {item.amount.toLocaleString()}
                  </td>
                </tr>
              ))}

              {/* Pad empty rows to match original printed blank sheet aesthetic */}
              {Array.from({ length: emptyRowsCount }).map((_, i) => {
                const rowNum = filledItems.length + i + 1
                return (
                  <tr key={`empty-${i}`} className="h-7 border-t border-slate-100">
                    <td className="py-1 px-3 text-center font-bold text-slate-400 border-r border-slate-200">
                      {rowNum}
                    </td>
                    <td className="py-1 px-3 border-r border-slate-200 border-b border-dotted border-slate-100"></td>
                    <td className="py-1 px-3 border-r border-slate-200"></td>
                    <td className="py-1 px-3 text-center text-slate-300 border-r border-slate-200">
                      _____
                    </td>
                    <td className="py-1 px-3 text-center text-slate-300 border-r border-slate-200">
                      _____
                    </td>
                    <td className="py-1 px-3 text-right text-slate-300">
                      ___________
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ===================== TERMS & TOTALS ===================== */}
        <div className="grid grid-cols-12 gap-5 mb-4">
          {/* Terms & Conditions (7 cols) */}
          <div className="col-span-7 border-2 border-[#002855] rounded-xl overflow-hidden bg-white shadow-2xs flex flex-col">
            <div className="bg-[#002855] text-white px-3.5 py-1 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span>📋</span>
                <span>Terms & Conditions</span>
              </div>
              <div
                className="w-8 h-full bg-[#E5A93C] -mr-3.5"
                style={{ clipPath: 'polygon(10px 0, 100% 0, 100% 100%, 0% 100%)' }}
              />
            </div>
            <div className="p-3 text-[11px] text-slate-700 space-y-1.5 flex-1">
              <div className="flex items-start gap-2">
                <span className="text-[#E5A93C] font-black text-sm leading-none">•</span>
                <span>Payment to be made at the time of delivery.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#E5A93C] font-black text-sm leading-none">•</span>
                <span>Goods once sold will not be taken back.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#E5A93C] font-black text-sm leading-none">•</span>
                <span>We are not responsible for any delay due to unforeseen circumstances.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#E5A93C] font-black text-sm leading-none">•</span>
                <span className="font-semibold text-slate-900">Thank you for your business!</span>
              </div>
            </div>
          </div>

          {/* Totals Box (5 cols) */}
          <div className="col-span-5 border-2 border-[#002855] rounded-xl overflow-hidden bg-white shadow-2xs flex flex-col justify-between">
            <div className="p-2.5 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-800">
                <span className="font-bold">Sub Total</span>
                <span className="font-semibold">{data.subtotal.toLocaleString()} Rs.</span>
              </div>

              {data.totalMazdoori && data.totalMazdoori > 0 ? (
                <div className="flex justify-between items-center text-purple-800">
                  <span className="font-medium text-[11px]">Total Mazdoori (Labor)</span>
                  <span className="font-semibold">+{data.totalMazdoori.toLocaleString()} Rs.</span>
                </div>
              ) : null}

              <div className="flex justify-between items-center text-slate-800">
                <span className="font-bold">Discount</span>
                <span className="font-semibold">
                  {data.discount > 0 ? `-${data.discount.toLocaleString()}` : '0'} Rs.
                </span>
              </div>
            </div>

            {/* Total Amount Dark Navy Ribbon */}
            <div className="bg-[#002855] text-white px-3 py-2 flex justify-between items-center border-t-2 border-[#E5A93C]">
              <span className="font-black text-sm tracking-wider uppercase">Total Amount</span>
              <span className="font-black text-base text-[#E5A93C]">
                {data.total.toLocaleString()} Rs.
              </span>
            </div>

            {/* Paid / Credit Sub-row */}
            {(data.paidAmount > 0 || data.remainingCredit > 0) && (
              <div className="bg-slate-50 px-3 py-1.5 text-[11px] flex justify-between items-center border-t border-slate-200">
                <span className="text-slate-600 font-medium">
                  Paid: <strong className="text-emerald-700">{data.paidAmount.toLocaleString()} Rs.</strong>
                </span>
                <span className="text-slate-600 font-medium">
                  Balance:{' '}
                  <strong className={data.remainingCredit > 0 ? 'text-red-600' : 'text-emerald-700'}>
                    {data.remainingCredit.toLocaleString()} Rs.
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ===================== BOTTOM BANNER ===================== */}
        <div className="pt-2 text-center relative">
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1.5px] bg-[#E5A93C] flex-1 max-w-[180px]" />
            <span
              className="text-[#002855] text-lg font-bold italic tracking-wide"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {footerText}
            </span>
            <div className="h-[1.5px] bg-[#E5A93C] flex-1 max-w-[180px]" />
          </div>
        </div>

        {/* Bottom-Left Decorative Swoosh */}
        <div className="absolute bottom-0 left-0 w-32 h-8 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 140 40" className="w-full h-full">
            <path d="M0,40 Q70,40 140,0 L0,0 Z" fill="#E5A93C" />
            <path d="M0,40 Q50,40 100,0 L0,0 Z" fill="#002855" />
          </svg>
        </div>

        {/* Bottom-Right Decorative Swoosh */}
        <div className="absolute bottom-0 right-0 w-32 h-8 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 140 40" className="w-full h-full">
            <path d="M140,40 Q70,40 0,0 L140,0 Z" fill="#E5A93C" />
            <path d="M140,40 Q90,40 40,0 L140,0 Z" fill="#002855" />
          </svg>
        </div>
      </div>
    )
  }
)

ShopInvoiceTemplate.displayName = 'ShopInvoiceTemplate'
