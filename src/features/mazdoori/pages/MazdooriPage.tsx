import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react'
import { formatPKR, formatDate, localDateKey } from '@/utils/financial'
import { getSales, getCustomers } from '@/services/sqlite.service'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import { BillPreviewModal } from '@/features/billing/components/BillPreviewModal'
import type { ShopInvoiceData } from '@/features/billing/components/ShopInvoiceTemplate'
import { saleToInvoiceData } from '@/features/billing/invoice-data'
import type { Customer, Sale } from '@/types'

import { mazdooriPeriod, isInMazdooriPeriod, mazdooriSummary, mazdooriLedger, type MazdooriPreset } from '../period'
import { WeeklyMazdooriRecords } from '../components/WeeklyMazdooriRecords'
import { MazdooriLedgerTable } from '../components/MazdooriLedgerTable'

type DatePreset = MazdooriPreset

const PAGE_SIZE = 10

// Mazdoori is read from saved bills: every bill with labour, linked to its customer
export function MazdooriPage() {
  const navigate = useNavigate()
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedInvoice, setSelectedInvoice] = useState<ShopInvoiceData | null>(null)
  const [view, setView] = useState<'records' | 'weeks'>('records')

  useEffect(() => {
    Promise.all([getSales(), getCustomers()])
      .then(([s, c]) => {
        setSales(s.filter((sale) => (sale.totalMazdoori || 0) > 0))
        setCustomers(c)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setIsLoading(false))
  }, [reloadKey])

  const todayKey = localDateKey()

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, datePreset, fromDate, toDate])

  const period = useMemo(() => mazdooriPeriod(datePreset, todayKey, fromDate, toDate), [datePreset, todayKey, fromDate, toDate])
  const periodDates = period.from && period.to
    ? formatDate(period.from + 'T12:00:00') + ' to ' + formatDate(period.to + 'T12:00:00')
    : period.from ? 'From ' + formatDate(period.from + 'T12:00:00')
      : period.to ? 'Until ' + formatDate(period.to + 'T12:00:00') : 'All saved records'

  const filteredSales = useMemo(() => {
    const query = searchTerm.toLowerCase().trim()
    return sales.filter((sale) => {
      // Date filter
      if (!isInMazdooriPeriod(sale.createdAt, period)) return false

      // Search query
      if (!query) return true
      return (
        sale.invoiceNumber.toLowerCase().includes(query) ||
        (sale.customerName || 'cash sale').toLowerCase().includes(query) ||
        sale.items.some((item) => item.itemName.toLowerCase().includes(query))
      )
    })
  }, [sales, searchTerm, period])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE))
  const validPage = Math.min(currentPage, totalPages)
  const ledger = useMemo(() => mazdooriLedger(filteredSales), [filteredSales])
  const paginatedRows = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE
    return ledger.slice(start, start + PAGE_SIZE)
  }, [ledger, validPage])

  // Both summaries include all matching pages and exclude cancelled bills.
  const summary = mazdooriSummary(filteredSales)

  const totals = ledger.at(-1)
  const openBill = (sale: Sale) => setSelectedInvoice(saleToInvoiceData(sale, customers.find(c => c.id === sale.customerId)))
  const filters: { value: DatePreset; label: string }[] = [
    { value: 'all', label: 'All time' }, { value: 'today', label: 'Today' }, { value: 'weekly', label: 'This week' },
    { value: 'monthly', label: 'This month' }, { value: 'custom', label: 'Custom dates' },
  ]
  const controlClass = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200'
  return <div className="flex flex-col gap-5 pb-4">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-xl font-semibold text-slate-900">Mazdoori</h1><p className="mt-1 text-sm text-slate-500">Daily work and weekly records.</p></div>
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1" role="group" aria-label="Mazdoori views">
        {([{ value: 'records', label: 'Mazdoori records' }, { value: 'weeks', label: 'Weekly records' }] as const).map(tab => <button key={tab.value} type="button" aria-pressed={view === tab.value} onClick={() => setView(tab.value)} className={cn('rounded-md px-3 py-2 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-500', view === tab.value ? 'bg-white text-blue-800 shadow-xs ring-1 ring-blue-200' : 'text-slate-500 hover:text-slate-800')}>{tab.label}</button>)}
      </div>
    </header>
    {view === 'weeks' ? <WeeklyMazdooriRecords sales={sales} isLoading={isLoading} error={error} onViewBill={openBill} /> : <section className="rounded-xl border border-slate-200 bg-white">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Date filters">{filters.map(filter => <button key={filter.value} type="button" aria-pressed={datePreset === filter.value} onClick={() => setDatePreset(filter.value)} className={cn('rounded-md px-3 py-2 text-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-500', datePreset === filter.value ? 'bg-blue-50 font-semibold text-blue-800 ring-1 ring-blue-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800')}>{filter.label}</button>)}</div>
          <div className="relative w-full lg:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" aria-label="Search mazdoori records" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search customer, bill or item" className={controlClass + ' w-full pl-9'} /></div>
        </div>
        {datePreset === 'custom' && <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">From</span><input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className={controlClass} /></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">To</span><input type="date" min={fromDate} value={toDate} onChange={event => setToDate(event.target.value)} className={controlClass} /></label>
          {(fromDate || toDate) && <button type="button" onClick={() => { setFromDate(''); setToDate('') }} className="px-2 py-2 text-sm text-slate-600 underline underline-offset-4 cursor-pointer">Clear dates</button>}
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><p>{periodDates}{searchTerm.trim() ? ' · Search results' : ''}</p>{datePreset === 'weekly' && <p>Saturday–Thursday · Friday off</p>}</div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-live="polite">
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4"><dt className="text-xs font-semibold text-teal-800">{period.label}</dt><dd className="mt-1 text-2xl font-bold tracking-tight text-teal-900">{formatPKR(summary.total)}</dd></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><dt className="text-xs font-semibold text-slate-600">Total weight</dt><dd className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{(totals?.totalWeight ?? 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd><p className="mt-1 text-xs text-slate-500">From bill Qty/Kg</p></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><dt className="text-xs font-semibold text-slate-600">Active records</dt><dd className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{summary.bills}</dd><p className="mt-1 text-xs text-slate-500">Across {summary.days} {summary.days === 1 ? 'day' : 'days'}</p></div>
        </dl>
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
      {isLoading ? <div className="p-12 text-center text-sm text-slate-500" role="status">Loading records…</div> : <div className="overflow-x-auto border-t border-slate-200"><MazdooriLedgerTable rows={paginatedRows} totals={totals} onViewBill={openBill} /></div>}
      {filteredSales.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-5">
        <p className="text-xs text-slate-500">{(validPage - 1) * PAGE_SIZE + 1}–{Math.min(validPage * PAGE_SIZE, filteredSales.length)} of {filteredSales.length} records</p>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Previous page" onClick={() => setCurrentPage(validPage - 1)} disabled={validPage <= 1} className={'rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 flex items-center gap-1 cursor-pointer hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-40 disabled:cursor-not-allowed'}><ChevronLeft className="h-4 w-4" />Previous</button>
          <span className="text-xs text-slate-500">{validPage} / {totalPages}</span>
          <button type="button" aria-label="Next page" onClick={() => setCurrentPage(validPage + 1)} disabled={validPage >= totalPages} className={'rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 flex items-center gap-1 cursor-pointer hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-40 disabled:cursor-not-allowed'}>Next<ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>}
    </section>}
    <BillPreviewModal isOpen={!!selectedInvoice} data={selectedInvoice} onClose={() => setSelectedInvoice(null)} onNewBill={() => navigate(ROUTES.NEW_BILL)} onCancelled={() => setReloadKey(k => k + 1)} />
  </div>
}
