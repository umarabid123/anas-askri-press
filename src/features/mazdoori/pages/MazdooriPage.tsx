import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  HardHat,
  Search,
} from 'lucide-react'
import { formatPKR, formatDate, localDateKey, roundMoney } from '@/utils/financial'
import { getSales, getCustomers } from '@/services/sqlite.service'
import { activeSales } from '@/utils/reports'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import { BillPreviewModal } from '@/features/billing/components/BillPreviewModal'
import type { ShopInvoiceData } from '@/features/billing/components/ShopInvoiceTemplate'
import { saleToInvoiceData } from '@/features/billing/invoice-data'
import type { Customer, Sale } from '@/types'

type DatePreset = 'all' | 'today' | 'weekly' | 'monthly' | 'custom'

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

  const isInDateRange = (dateString: string) => {
    const key = localDateKey(dateString)
    if (datePreset === 'today') return key === todayKey
    if (datePreset === 'weekly') {
      const start = new Date()
      start.setDate(start.getDate() - 6)
      return key >= localDateKey(start) && key <= todayKey
    }
    if (datePreset === 'monthly') {
      return key.slice(0, 7) === todayKey.slice(0, 7)
    }
    if (datePreset === 'custom') {
      return (!fromDate || key >= fromDate) && (!toDate || key <= toDate)
    }
    return true
  }

  const filteredSales = useMemo(() => {
    const query = searchTerm.toLowerCase().trim()
    return sales.filter((sale) => {
      // Date filter
      if (!isInDateRange(sale.createdAt)) return false

      // Search query
      if (!query) return true
      return (
        sale.invoiceNumber.toLowerCase().includes(query) ||
        (sale.customerName || 'cash sale').toLowerCase().includes(query) ||
        sale.items.some((item) => item.itemName.toLowerCase().includes(query))
      )
    })
  }, [sales, searchTerm, datePreset, fromDate, toDate, todayKey])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE))
  const validPage = Math.min(currentPage, totalPages)
  const paginatedSales = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE
    return filteredSales.slice(start, start + PAGE_SIZE)
  }, [filteredSales, validPage])

  // Totals count only valid (not cancelled) bills
  const counted = activeSales(sales)
  const sumMazdoori = (rows: Sale[]) =>
    roundMoney(rows.reduce((sum, sale) => sum + (sale.totalMazdoori || 0), 0))
  const totalMazdoori = sumMazdoori(counted)
  const monthMazdoori = sumMazdoori(
    counted.filter((sale) => localDateKey(sale.createdAt).slice(0, 7) === todayKey.slice(0, 7))
  )
  const todayMazdoori = sumMazdoori(
    counted.filter((sale) => localDateKey(sale.createdAt) === todayKey)
  )

  return (
    <div className="space-y-4 h-full flex flex-col justify-between">
      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex-1 flex flex-col">
        {/* Title & Search Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-slate-900 leading-tight">Mazdoori (Labor Ledger)</h1>
              <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full">
                {filteredSales.length} {filteredSales.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Labour charged on bills, linked to each customer's invoice
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice, customer or item..."
              className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Date Filter Tabs Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setDatePreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                datePreset === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                datePreset === 'today'
                  ? 'bg-white text-purple-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                datePreset === 'weekly'
                  ? 'bg-white text-purple-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                datePreset === 'monthly'
                  ? 'bg-white text-purple-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                datePreset === 'custom'
                  ? 'bg-white text-purple-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 font-medium text-slate-600">
                <span>From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 px-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-purple-500"
                />
              </label>
              <label className="flex items-center gap-1.5 font-medium text-slate-600">
                <span>To:</span>
                <input
                  type="date"
                  min={fromDate}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 px-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-purple-500"
                />
              </label>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('')
                    setToDate('')
                  }}
                  className="text-xs text-purple-600 hover:underline font-semibold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* Content Table Container */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="animate-spin w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Mazdoori Detail</th>
                    <th className="py-2.5 px-4 text-right">Mazdoori</th>
                    <th className="py-2.5 px-4 text-right">Bill Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <p className="font-semibold text-sm">No mazdoori records found</p>
                        <p className="text-xs mt-1">
                          {searchTerm || datePreset !== 'all'
                            ? 'No records match the current filter.'
                            : 'Bills saved with a Mazdoori amount appear here automatically.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSales.map((sale, index) => (
                      <tr
                        key={sale.id}
                        onClick={() => setSelectedInvoice(saleToInvoiceData(sale, customers.find((c) => c.id === sale.customerId)))}
                        className={cn('hover:bg-slate-50/50 cursor-pointer', sale.cancelledAt && 'opacity-60')}
                        title="View invoice"
                      >
                        <td className="py-3 px-3 text-center text-xs font-medium text-slate-500">
                          {(validPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                          {formatDate(sale.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 text-xs whitespace-nowrap">
                          {sale.invoiceNumber}
                          {sale.cancelledAt && (
                            <span className="ml-1.5 text-[10px] font-bold uppercase text-red-600 bg-red-50 border border-red-200 rounded px-1.5">
                              Cancelled
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {sale.customerId ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(ROUTES.CUSTOMER_DETAIL.replace(':id', sale.customerId!))
                              }}
                              className="font-semibold text-slate-900 hover:text-purple-600 text-left transition-colors cursor-pointer"
                            >
                              {sale.customerName}
                            </button>
                          ) : (
                            <span className="font-semibold text-slate-500">
                              {sale.customerName || 'Cash Sale'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700">
                          {sale.items.filter((item) => item.mazdoori > 0).map((item) => (
                            <p key={item.id}>
                              <span className="font-medium">{item.itemName}</span>: {formatPKR(item.mazdoori)}
                              {(item.mazdooriTasks || []).length > 0 && (
                                <span className="text-slate-400">
                                  {' '}({item.mazdooriTasks!.map((task) => task.title + (task.workerName ? ' – ' + task.workerName : '')).join(', ')})
                                </span>
                              )}
                            </p>
                          ))}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-purple-700 text-sm whitespace-nowrap">
                          {formatPKR(sale.totalMazdoori || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                          {formatPKR(sale.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls Footer (10 records per page) */}
          {filteredSales.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 bg-slate-50/60">
              <p className="text-xs text-slate-500 font-medium">
                Showing{' '}
                <span className="font-bold text-slate-800">
                  {(validPage - 1) * PAGE_SIZE + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-slate-800">
                  {Math.min(validPage * PAGE_SIZE, filteredSales.length)}
                </span>{' '}
                of{' '}
                <span className="font-bold text-slate-800">
                  {filteredSales.length}
                </span>{' '}
                records
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPage <= 1}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {/* Page indicator pills */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - validPage) <= 1
                    )
                    .map((pageNum, idx, arr) => {
                      const prev = arr[idx - 1]
                      return (
                        <div key={pageNum} className="flex items-center">
                          {prev && pageNum - prev > 1 && (
                            <span className="px-1 text-slate-400 text-xs">…</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              validPage === pageNum
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {pageNum}
                          </button>
                        </div>
                      )
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage >= totalPages}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 px-8 py-3.5 shadow-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-purple-900 text-white flex items-center justify-center">
            <HardHat className="w-5 h-5 fill-white stroke-none" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-600 leading-tight">Bills with Mazdoori</p>
            <p className="text-[20px] font-bold text-slate-900 leading-tight">{counted.length}</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Today's Mazdoori</p>
          <p className="text-[20px] font-bold text-slate-900 leading-tight">{formatPKR(todayMazdoori)}</p>
        </div>

        <div className="text-center">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">This Month</p>
          <p className="text-[20px] font-bold text-slate-900 leading-tight">{formatPKR(monthMazdoori)}</p>
        </div>

        <div className="text-right">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Mazdoori</p>
          <p className="text-[20px] font-bold text-purple-700 leading-tight">{formatPKR(totalMazdoori)}</p>
        </div>
      </div>

      <BillPreviewModal
        isOpen={!!selectedInvoice}
        data={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onNewBill={() => navigate(ROUTES.NEW_BILL)}
        onCancelled={() => setReloadKey((k) => k + 1)}
      />
    </div>
  )
}
