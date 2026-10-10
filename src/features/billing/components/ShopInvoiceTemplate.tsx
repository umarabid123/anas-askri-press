import React from 'react'
import { CalendarDays, CreditCard, FileText, Layers, Mail, MapPin, Palette, Phone, Scissors, UserRound } from 'lucide-react'
import type { Customer, SaleItem, BusinessSettings } from '@/types'
import { parseDate } from '@/utils/financial'
import { invoiceAccountTotals } from '../invoice-data'

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
  customerId?: string | null
  previousBalance?: number
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
    const account = invoiceAccountTotals(data)
    // Fill up to at least 6 rows so it matches the reference template layout exactly
    const minRows = 6
    const filledItems = [...data.items]
    const emptyRowsCount = Math.max(0, minRows - filledItems.length)

    const rawShopName = (settings?.businessName || 'ANAS ARKI PRESS').replace(/\s*&\s*LASER\s*CUTTING/i, '').trim()
    let primaryName = 'ANAS ARKI'
    let secondaryName = 'PRESS'
    if (/\sPRESS\b/i.test(rawShopName)) {
      const splitAt = rawShopName.search(/\sPRESS\b/i)
      primaryName = rawShopName.slice(0, splitAt).trim()
      secondaryName = rawShopName.slice(splitAt).trim()
    } else if (rawShopName.includes('&')) {
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

    const tagline = settings?.subtitle ?? 'PRECISION | QUALITY | YOUR VISION OUR WORK'
    const targetAddress = 'Dhuddiwala, Lower Canal Road, Near Askari Bank, Jaranwala Road, Faisalabad, Pakistan.'
    const address = settings?.address && !settings.address.toLowerCase().includes('dhuddi wala') && settings.address !== 'Dhuddi wala Lower Canal Near Askari Bank Main Jaranwala Road'
      ? settings.address
      : targetAddress

    const targetPhone = '03007973059'
    const phone = (settings?.phone && settings.phone !== '0300-7973059') ? settings.phone : targetPhone
    const email = 'barkatarkipress@outlook.com'
    const footerText = settings?.footerText ?? 'Thank You For Your Business'

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
        <div className="text-center border-b border-black pb-2">
          <h1 className="font-bold text-sm">{primaryName} {secondaryName}</h1>
          <p className="font-semibold text-xs">Ali Asghar</p>
          <p>{address}</p>
          <p>{phone}</p>
          <p>{email}</p>
        </div>
        <p className="font-bold mt-2">Invoice {data.invoiceNumber}</p><p>{formattedDate} · {data.paymentMethod.toUpperCase()}</p>
        {data.cancelledAt && <p className="text-center font-bold border border-black my-1">*** {data.cancelReason?.startsWith('Updated:') ? 'OLD BILL' : 'CANCELLED'} ***</p>}
        <p>{customerName || 'Cash Customer'} {customerPhone}</p>
        {customerAddress && <p>{customerAddress}</p>}
        <div className="border-y border-dashed border-black my-2 py-2">
          {data.items.map((item, index) => <div key={item.id || index} className="mb-2">
            <p className="font-semibold break-words">{index + 1}. {item.itemName}</p>
            <div className="flex justify-between gap-2"><span>{item.quantity}{item.unit?.toLowerCase() === 'qty' ? ' Qty' : ' kg'} × {item.rate.toLocaleString()}</span><b>{item.amount.toLocaleString()}</b></div>
          </div>)}
        </div>
        {([
          ['Sub Total', data.total],
          ...(account.previousBalance ? [[account.previousBalance > 0 ? 'Previous Dues' : 'Previous Advance', account.previousBalance] as [string, number]] : []),
          ['TOTAL', account.total],
          ['Paid', data.paidAmount],
          ['Balance', account.balance],
          ...(account.advance > 0 ? [['Advance Remaining', account.advance] as [string, number]] : []),
        ] as [string, number][]).map(([label, amount]) => <div key={label} className="flex justify-between gap-2"><span>{label}</span><b>{Number(amount).toLocaleString('en-PK', { maximumFractionDigits: 2 })}</b></div>)}
        <p className="text-center mt-3 border-t border-black pt-2">{footerText}</p>
      </div>
    )

    const money = (amount: number) => amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })
    const services = [
      { Icon: Layers, label: 'Banding' },
      { Icon: Scissors, label: 'Cutting' },
      { Icon: Palette, label: 'Custom Design' },
    ]

    return (
      <div id={id} ref={ref} className="shop-invoice">
        <div className="invoice-sheet">
          {data.cancelledAt && <div className="invoice-stamp"><span>{data.cancelReason?.startsWith('Updated:') ? 'OLD BILL' : 'CANCELLED'}</span></div>}
          <svg className="invoice-top-corners" viewBox="0 0 950 80" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0H100L0 78Z M950 0H880L950 64Z" fill="#dca312" />
            <path d="M0 0H78L0 60Z M950 0H905L950 42Z" fill="#082e60" />
            <path d="M0 0H52L0 40Z" fill="#f1bd36" />
          </svg>
          <header className="invoice-letterhead">
            <div className="invoice-brand">
              {settings?.showLogo !== false && (
                <img
                  src={settings?.logoPath || "/logo.png"}
                  alt="Anas Arki Press logo"
                  className="invoice-logo object-contain"
                />
              )}
              <div className="invoice-brand-type">
                <h1>{primaryName}</h1>
                {secondaryName && <h2>{secondaryName}</h2>}
                {tagline && <p>{tagline}</p>}
              </div>
            </div>
            <div className="invoice-services">
              {services.map(({ Icon, label }) => <div key={label}><span><Icon aria-hidden="true" /></span><b>{label}</b></div>)}
            </div>
            <div className="invoice-contact">
              <div className="invoice-shop-owner"><UserRound aria-hidden="true" /><span>Ali Asghar</span></div>
              {phone && <div className="invoice-shop-phone"><Phone aria-hidden="true" /><span>{phone}</span></div>}
              {address && <div className="invoice-shop-address"><MapPin aria-hidden="true" /><span>{address}</span></div>}
              <div className="invoice-shop-email"><Mail aria-hidden="true" /><span>{email}</span></div>
            </div>
          </header>
          <div className="invoice-title"><span>INVOICE</span></div>
          <div className="invoice-details">
            <section className="invoice-customer">
              <h3><UserRound aria-hidden="true" />Customer Details</h3>
              <dl>
                <div><dt>Name</dt><dd>{customerName || 'Cash Customer'}</dd></div>
                <div><dt>Address</dt><dd>{customerAddress || ' '}</dd></div>
                <div><dt>Phone</dt><dd>{customerPhone || ' '}</dd></div>
              </dl>
            </section>
            <dl className="invoice-meta">
              <div><dt><FileText aria-hidden="true" />Invoice No</dt><dd>{data.invoiceNumber}</dd></div>
              <div><dt><CalendarDays aria-hidden="true" />Date</dt><dd>{formattedDate}</dd></div>
              <div><dt><CreditCard aria-hidden="true" />Payment Type</dt><dd>{data.paymentMethod === 'bank' ? 'Bank' : 'Cash'}</dd></div>
            </dl>
          </div>
          <div className="invoice-table-frame">
            <table className="invoice-items">
              <colgroup><col className="invoice-col-number" /><col /><col className="invoice-col-qty" /><col className="invoice-col-rate" /><col className="invoice-col-amount" /></colgroup>
              <thead><tr><th scope="col">Sr.</th><th scope="col">Description</th><th scope="col">Qty/Kg</th><th scope="col">Rate (Rs.)</th><th scope="col">Amount (Rs.)</th></tr></thead>
              <tbody>
                {filledItems.map((item, index) => <tr key={item.id || index}>
                  <td>{index + 1}</td><td dir="auto">{item.itemName}</td><td>{money(item.quantity)}{item.unit?.toLowerCase() === 'qty' ? ' Qty' : ' kg'}</td><td>{money(item.rate)}</td><td>{money(item.amount)}</td>
                </tr>)}
                {Array.from({ length: emptyRowsCount }, (_, i) => <tr key={`empty-${i}`} className="invoice-empty-row" aria-hidden="true">
                  <td>{filledItems.length + i + 1}</td><td /><td /><td><span /></td><td><span /></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="invoice-bottom">
            <section className="invoice-terms">
              <h3><FileText aria-hidden="true" />Terms &amp; Conditions</h3>
              <ul>
                <li>Payment to be made at the time of delivery.</li>
                <li>Goods once sold will not be taken back.</li>
                <li>We are not responsible for any delay due to unforeseen circumstances.</li>
                <li>Thank you for your business!</li>
              </ul>
            </section>
            <section className="invoice-totals" aria-label="Bill totals">
              <div className="invoice-total-row"><span>Sub Total</span><strong>{money(data.total)} <small>Rs.</small></strong></div>
              {account.previousBalance !== 0 && <div className="invoice-total-row invoice-previous"><span>{account.previousBalance > 0 ? 'Previous Dues (Purana Udhaar)' : 'Previous Advance'}</span><strong>{money(account.previousBalance)} <small>Rs.</small></strong></div>}
              <div className="invoice-grand-total"><span>Total Amount</span><strong>{money(account.total)} <small>Rs.</small></strong></div>
              <div className="invoice-payment">
                <div className="invoice-payment-col invoice-paid-box">
                  <span className="invoice-payment-label">Paid:</span>
                  <b className="invoice-payment-val">{money(data.paidAmount)} Rs.</b>
                </div>
                <div className={`invoice-payment-col ${account.advance > 0 ? 'invoice-advance-box' : 'invoice-balance-box'}`}>
                  <span className="invoice-payment-label">{account.advance > 0 ? 'Advance Remaining:' : 'Remaining Balance:'}</span>
                  <b className="invoice-payment-val">{money(account.advance || account.balance)} Rs.</b>
                </div>
              </div>
            </section>
          </div>
          <footer className="invoice-thanks"><span>{footerText}</span></footer>
          <svg className="invoice-bottom-swoosh" viewBox="0 0 950 75" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0Q75 50 275 75H0Z M950 0Q875 50 675 75H950Z" fill="#e2ab20" />
            <path d="M0 18Q80 59 305 75H0Z M950 18Q870 59 645 75H950Z" fill="#082e60" />
          </svg>
        </div>
      </div>
    )
  }
)

ShopInvoiceTemplate.displayName = 'ShopInvoiceTemplate'
