import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileEdit,
  Search,
  Eye,
  Plus,
  RefreshCw,
  User,
  Calendar,
  AlertCircle,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/constants/routes'
import { getSales, getCustomers, receivePayment } from '@/services/sqlite.service'
import { formatPKR, formatDate, localDateKey } from '@/utils/financial'
import { useCartStore } from '@/stores/cart.store'
import { toast } from '@/stores/toast.store'
import { BillPreviewModal } from '../components/BillPreviewModal'
import { ReceivePaymentModal } from '@/features/customers/components/ReceivePaymentModal'
import { saleToInvoiceData } from '../invoice-data'
import { startNewBill, editBlockReason } from '../bill-actions'
import type { Customer, Sale } from '@/types'
import type { ShopInvoiceData } from '../components/ShopInvoiceTemplate'

type DatePreset = 'all' | 'today' | 'weekly' | 'monthly' | 'custom'
type StatusFilter = 'all' | 'unpaid' | 'paid'

const PAGE_SIZE = 10

export function UpdateBillPage() {
  const navigate = useNavigate()
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedInvoice, setSelectedInvoice] = useState<ShopInvoiceData | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Payment Receipt State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentSale, setPaymentSale] = useState<Sale | null>(null)
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [salesData, customersData] = await Promise.all([
        getSales(),
        getCustomers(),
      ])
      setSales(salesData)
      setCustomers(customersData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      toast.error('Failed to load bills: ' + msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [reloadKey])

  // Reset pagination whenever filters or search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, datePreset, statusFilter, fromDate, toDate])

  const todayKey = localDateKey()

  // Date range check helper
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

  // Filtered sales based on search, date preset, and payment status
  const filteredSales = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return sales.filter((sale) => {
      // Exclude legacy replaced ghost records
      if (sale.cancelReason?.startsWith('Updated:')) return false

      // Date filter
      if (!isInDateRange(sale.createdAt)) return false

      // Status filter
      if (statusFilter === 'unpaid') {
        if (!sale.remainingCredit || sale.remainingCredit <= 0 || sale.cancelledAt) return false
      } else if (statusFilter === 'paid') {
        if (sale.remainingCredit && sale.remainingCredit > 0) return false
      }

      // Search query
      if (!q) return true
      const invMatch = sale.invoiceNumber.toLowerCase().includes(q)
      const custMatch = sale.customerName && sale.customerName.toLowerCase().includes(q)
      const phoneMatch = sale.customerMobile && sale.customerMobile.includes(q)
      const itemMatch = sale.items.some((i) => i.itemName.toLowerCase().includes(q))
      return invMatch || custMatch || phoneMatch || itemMatch
    })
  }, [sales, searchQuery, datePreset, statusFilter, fromDate, toDate, todayKey])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE))
  const validPage = Math.min(currentPage, totalPages)
  const paginatedSales = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE
    return filteredSales.slice(start, start + PAGE_SIZE)
  }, [filteredSales, validPage])

  // Metric aggregates (based on current filtered view)
  const activeFilteredBills = useMemo(() => filteredSales.filter((s) => !s.cancelledAt), [filteredSales])
  const totalSalesAmount = useMemo(
    () => activeFilteredBills.reduce((sum, s) => sum + s.total, 0),
    [activeFilteredBills]
  )
  const totalUnpaidCredit = useMemo(
    () => activeFilteredBills.reduce((sum, s) => sum + (s.remainingCredit || 0), 0),
    [activeFilteredBills]
  )

  const handleUpdateBill = (sale: Sale) => {
    const blockReason = editBlockReason(sale.id, sales)
    if (blockReason) {
      toast.error(blockReason)
      return
    }

    const customer = customers.find((c) => c.id === sale.customerId) || null
    useCartStore.getState().editBill(sale, customer)
    toast.success(`Opening Bill #${sale.invoiceNumber} to update.`)
    navigate(ROUTES.NEW_BILL)
  }

  const handlePreviewBill = (sale: Sale) => {
    const customer = customers.find((c) => c.id === sale.customerId) || null
    setSelectedInvoice(saleToInvoiceData(sale, customer))
  }

  const handleStartNew = () => {
    if (startNewBill()) {
      navigate(ROUTES.NEW_BILL)
    }
  }

  const handleOpenReceivePayment = (sale: Sale) => {
    let cust = customers.find((c) => c.id === sale.customerId) || null
    if (!cust && sale.customerName) {
      cust = {
        id: sale.customerId || '',
        name: sale.customerName,
        mobile: sale.customerMobile || '',
        address: '',
        totalPurchase: sale.total,
        totalPaid: sale.paidAmount,
        balance: sale.remainingCredit || 0,
        createdAt: sale.createdAt,
        updatedAt: sale.createdAt,
        syncStatus: 'synced',
      }
    }
    setPaymentSale(sale)
    setPaymentCustomer(cust)
    setPaymentModalOpen(true)
  }

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 leading-tight">Update Bill</h1>
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
              {filteredSales.length} {filteredSales.length === 1 ? 'Bill' : 'Bills'}
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Search any saved bill by bill number or customer to edit and update details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={isLoading}
            className="flex items-center gap-1.5"
            title="Refresh bills list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            onClick={handleStartNew}
            className="bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Bill</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Row - 2-column Grid (Total Active Bills card removed) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500">Total Sales Value</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatPKR(totalSalesAmount)}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5 truncate">
            {activeFilteredBills.length} active bills in current view
          </p>
        </div>

        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <p className="text-xs font-medium text-amber-800">Total Udhaar (Unpaid)</p>
          <p className="text-xl font-bold text-amber-900 mt-1">{formatPKR(totalUnpaidCredit)}</p>
          <p className="text-xs text-amber-800 mt-1">Remaining balance to collect</p>
        </div>
      </div>

      {/* Search and Filters Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        {/* Row 1: Search and Status Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Field */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Bill #, Customer Name, Mobile, Item..."
              className="w-full h-10 pl-9 pr-14 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Payment Status Filter */}
          <select
            aria-label="Payment status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="h-10 w-full md:w-44 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid (Udhaar)</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Row 2: Date Preset Tabs (All, Today, Weekly, Monthly, Custom) & Custom Date Pickers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setDatePreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                datePreset === 'all'
                  ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200'
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
                  ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200'
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
                  ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200'
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
                  ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200'
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
                  ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200'
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
                  className="h-8 px-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </label>
              <label className="flex items-center gap-1.5 font-medium text-slate-600">
                <span>To:</span>
                <input
                  type="date"
                  min={fromDate}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 px-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </label>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('')
                    setToDate('')
                  }}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Bills Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {error ? (
          <div className="p-6 text-center text-sm text-red-600 bg-red-50">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p>{error}</p>
          </div>
        ) : isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm">Loading bills...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="py-16 text-center px-4">
            <FileCheck2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-base font-bold text-slate-800">No bills found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No bill matched "${searchQuery}". Try searching another name or bill number.`
                : 'No bills recorded for this filter yet.'}
            </p>
            {searchQuery && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-4"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[1050px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[12px] font-semibold text-slate-700 whitespace-nowrap">
                    <th className="py-3 px-4 min-w-[130px]">Bill #</th>
                    <th className="py-3 px-4 min-w-[120px]">Date</th>
                    <th className="py-3 px-4 min-w-[160px]">Customer</th>
                    <th className="py-3 px-4 min-w-[200px]">Items Summary</th>
                    <th className="py-3 px-4 min-w-[110px] text-right">Mazdoori (Rs)</th>
                    <th className="py-3 px-4 min-w-[110px] text-right">Total (Rs)</th>
                    <th className="py-3 px-4 min-w-[110px] text-right">Debit (Rs)</th>
                    <th className="py-3 px-4 min-w-[110px] text-right">Credit (Rs)</th>
                    <th className="py-3 px-4 min-w-[160px] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSales.map((sale) => {
                    const isCancelled = !!sale.cancelledAt && !sale.cancelReason?.startsWith('Updated:')
                    const mazdoori =
                      sale.totalMazdoori ??
                      sale.items.reduce((sum, item) => sum + (Number(item.mazdoori) || 0), 0)

                    return (
                      <tr
                        key={sale.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isCancelled ? 'bg-slate-50/40 text-slate-400' : ''
                        }`}
                      >
                        {/* Bill Number - strictly no wrap */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block text-[14px] whitespace-nowrap">
                            #{sale.invoiceNumber}
                          </span>
                          {isCancelled && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600 inline-block mt-0.5 whitespace-nowrap">
                              Cancelled
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDate(sale.createdAt)}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {sale.customerName ? (
                            <div className="whitespace-nowrap">
                              <p className="font-semibold text-slate-900 text-xs whitespace-nowrap">
                                {sale.customerName}
                              </p>
                              {sale.customerMobile && (
                                <p className="text-[11px] text-slate-500 whitespace-nowrap">
                                  {sale.customerMobile}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic flex items-center gap-1 whitespace-nowrap">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              Cash Sale (Walk-in)
                            </span>
                          )}
                        </td>

                        {/* Items Summary */}
                        <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap max-w-[240px]">
                          <p
                            className="truncate font-medium text-slate-800"
                            title={sale.items.map((i) => `${i.itemName} (${i.quantity})`).join(', ')}
                          >
                            {sale.items.map((i) => `${i.itemName} (${i.quantity})`).join(', ') || '—'}
                          </p>
                          <p className="text-[11px] text-slate-400 whitespace-nowrap">
                            {sale.items.length} item{sale.items.length === 1 ? '' : 's'}
                          </p>
                        </td>

                        {/* Mazdoori */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span
                            className={`text-sm font-semibold whitespace-nowrap ${
                              isCancelled
                                ? 'line-through text-slate-400'
                                : mazdoori > 0
                                ? 'text-purple-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {formatPKR(mazdoori)}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-bold text-sm whitespace-nowrap ${
                              isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {formatPKR(sale.total)}
                          </span>
                        </td>

                        {/* Debit (Paid) */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span
                            className={`text-sm font-semibold whitespace-nowrap ${
                              isCancelled
                                ? 'line-through text-slate-400'
                                : sale.paidAmount > 0
                                ? 'text-emerald-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {formatPKR(sale.paidAmount || 0)}
                          </span>
                        </td>

                        {/* Credit (Udhaar) */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span
                            className={`text-sm font-bold whitespace-nowrap ${
                              isCancelled
                                ? 'line-through text-slate-400'
                                : (sale.remainingCredit || 0) > 0
                                ? 'text-red-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {formatPKR(sale.remainingCredit || 0)}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            {/* Update Bill Button */}
                            <button
                              type="button"
                              onClick={() => handleUpdateBill(sale)}
                              className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap bg-blue-700 hover:bg-blue-800 text-white shadow-2xs"
                              title="Update this bill"
                            >
                              <FileEdit className="w-3.5 h-3.5" />
                              <span>Update</span>
                            </button>

                            {/* View / Print Button */}
                            <button
                              type="button"
                              onClick={() => handlePreviewBill(sale)}
                              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                              title="View / Print invoice"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {/* Receive Payment Button */}
                            {(() => {
                              const isPaid = (sale.remainingCredit || 0) <= 0 || isCancelled
                              return (
                                <button
                                  type="button"
                                  disabled={isPaid}
                                  onClick={() => handleOpenReceivePayment(sale)}
                                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap ${
                                    isPaid
                                      ? 'border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                                      : 'border border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer shadow-2xs'
                                  }`}
                                  title={
                                    isCancelled
                                      ? 'Bill is cancelled'
                                      : isPaid
                                      ? 'Bill is fully paid'
                                      : 'Receive payment for remaining credit'
                                  }
                                >
                                  <DollarSign className="w-3.5 h-3.5 stroke-[2.2]" />
                                  <span>Receive</span>
                                </button>
                              )
                            })()}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer (10 records per page) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 bg-slate-50/60">
              <p className="text-xs text-slate-500 font-medium">
                Showing{' '}
                <span className="font-bold text-slate-800">
                  {filteredSales.length === 0 ? 0 : (validPage - 1) * PAGE_SIZE + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-slate-800">
                  {Math.min(validPage * PAGE_SIZE, filteredSales.length)}
                </span>{' '}
                of <span className="font-bold text-slate-800">{filteredSales.length}</span> bills
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
                                ? 'bg-[#1877F2] text-white shadow-2xs'
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
          </>
        )}
      </div>

      {/* Preview & Print Modal */}
      <BillPreviewModal
        isOpen={!!selectedInvoice}
        data={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onNewBill={handleStartNew}
        onCancelled={() => setReloadKey((k) => k + 1)}
      />

      {/* Receive Payment Modal */}
      <ReceivePaymentModal
        isOpen={paymentModalOpen}
        customer={paymentCustomer}
        billInfo={
          paymentSale
            ? {
                saleId: paymentSale.id,
                invoiceNumber: paymentSale.invoiceNumber,
                total: paymentSale.total,
                remainingCredit: paymentSale.remainingCredit || 0,
              }
            : null
        }
        defaultAmount={paymentSale?.remainingCredit || 0}
        defaultNotes={paymentSale ? `Payment for Bill #${paymentSale.invoiceNumber}` : ''}
        onClose={() => {
          setPaymentModalOpen(false)
          setPaymentSale(null)
          setPaymentCustomer(null)
        }}
        onSubmit={async (payment) => {
          const receiptId = await receivePayment({
            ...payment,
            saleId: paymentSale?.id,
          })
          toast.success(`Payment of ${formatPKR(payment.amount)} received for Bill #${paymentSale?.invoiceNumber}!`)
          setPaymentModalOpen(false)
          setPaymentSale(null)
          setPaymentCustomer(null)
          await loadData()
          setReloadKey((k) => k + 1)
          return receiptId
        }}
      />
    </div>
  )
}
