import { useState, useEffect } from 'react'
import {
  Eye,
  HardHat,
  Printer,
  Search,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react'
import { flushSync } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { formatPKR, localDateKey, formatDate } from '@/utils/financial'
import { getSales, getCustomers, getMazdoors, getPayments, type Receipt } from '@/services/sqlite.service'
import { BillPreviewModal } from '@/features/billing/components/BillPreviewModal'
import type { ShopInvoiceData } from '@/features/billing/components/ShopInvoiceTemplate'
import type { Sale, Customer, Mazdoor } from '@/types'

import { dailyReport, activeSales, activePayments } from '@/utils/reports'
import { saleToInvoiceData } from '@/features/billing/invoice-data'
import { printDocument } from '@/utils/printing'

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'customer' | 'mazdoori' | 'daily'>('sales')
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [payments, setPayments] = useState<Receipt[]>([])
  const [error, setError] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [workers, setWorkers] = useState<Mazdoor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  // Filter states
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // View details modal
  const [selectedInvoice, setSelectedInvoice] = useState<ShopInvoiceData | null>(null)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [salesData, customersData, workersData, paymentsData] = await Promise.all([
          getSales(),
          getCustomers(),
          getMazdoors(),
          getPayments(),
        ])
        setPayments(paymentsData)
        setSales(salesData)
        setCustomers(customersData)
        setWorkers(workersData)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [reloadKey])

  const inRange = (value: string) => {
    const key = localDateKey(value), today = localDateKey()
    if (datePreset === 'today') return key === today
    if (datePreset === 'week') { const start = new Date(); start.setDate(start.getDate() - 6); return key >= localDateKey(start) && key <= today }
    if (datePreset === 'month') return key.slice(0, 7) === today.slice(0, 7)
    if (datePreset === 'custom') return (!fromDate || key >= fromDate) && (!toDate || key <= toDate)
    return true
  }
  const filteredSales = sales.filter(sale => inRange(sale.createdAt))
  // Cancelled invoices stay listed but count towards no totals; their at-sale payments were refunded
  const filteredPayments = activePayments(payments, sales).filter(payment => inRange(payment.paymentDate))
  const countedSales = activeSales(filteredSales)
  const totalRevenue = countedSales.reduce((sum, sale) => sum + sale.total, 0)
  const totalReceived = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const totalCustomerReceivables = customers.reduce((sum, customer) => sum + customer.balance, 0)
  const totalMazdooriLiability = workers.reduce((sum, worker) => sum + worker.balance, 0)
  const dailyReportData = dailyReport(filteredSales, filteredPayments)

  // Handle invoice view details
  const handleViewInvoice = (sale: Sale) => {
    setSelectedInvoice(saleToInvoiceData(sale, customers.find(c => c.id === sale.customerId)))
  }

  // Filtered rows for active tab
  const displayedSales = filteredSales.filter(
    (s) =>
      s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const displayedCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm)
  )

  const displayedWorkers = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.phone && w.phone.includes(searchTerm))
  )

  const displayedDaily = dailyReportData.filter((d) => d.date.includes(searchTerm))

  const PAGE_SIZE = 10
  const rowCount = activeTab === 'sales' ? displayedSales.length : activeTab === 'customer' ? displayedCustomers.length : activeTab === 'mazdoori' ? displayedWorkers.length : displayedDaily.length
  const maxPage = Math.max(1, Math.ceil(rowCount / PAGE_SIZE))
  const currentPage = Math.min(page, maxPage)
  const paged = <T,>(rows: T[]) => printing ? rows : rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  return (
    <div id="financial-report-print" className="space-y-4">
      {error && <div role="alert" className="p-3 bg-red-50 text-red-700">{error}</div>}
      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 print:hidden"><label>From <input className="ml-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200" aria-label="Report start date" type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setDatePreset('custom'); setPage(1) }} /></label><label>To <input className="ml-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200" aria-label="Report end date" type="date" min={fromDate} value={toDate} onChange={e => { setToDate(e.target.value); setDatePreset('custom'); setPage(1) }} /></label></div>
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 leading-tight">Reports</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            See your sales, payments received, customer dues, and mazdoori
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Preset Selector */}
          <div className="flex flex-wrap items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setDatePreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                datePreset === 'all' ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDatePreset('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                datePreset === 'today' ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDatePreset('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                datePreset === 'week' ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDatePreset('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                datePreset === 'month' ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
          </div>

          {/* Print / Export Report */}
          <Button
            onClick={() => { flushSync(() => setPrinting(true)); window.addEventListener('afterprint', () => setPrinting(false), { once: true }); printDocument('financial-report-print') }}
            variant="outline"
            className="flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 stroke-[2]" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 ">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">{formatPKR(totalRevenue)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{countedSales.length} Total Invoices</p>
        </div>

        {/* Card 2: Received Cash/Bank */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 ">Payments Received</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-600">{formatPKR(totalReceived)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Collected Revenue</p>
        </div>

        {/* Card 3: Receivables (Credit Owed by Customers) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 ">Customer Dues (Udhaar)</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <p className="text-xl font-bold text-red-600">{formatPKR(totalCustomerReceivables)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Pending from Customers</p>
        </div>

        {/* Card 4: Mazdoori Liability (Owed to Workers) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 ">Labor Liability</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <HardHat className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <p className="text-xl font-bold text-teal-800">{formatPKR(totalMazdooriLiability)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Owed to Craftsmen/Workers</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col">
        {/* Navigation Tabs and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg max-w-full">
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'sales' ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sales Report ({filteredSales.length})
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'customer' ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer Balances ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('mazdoori')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'mazdoori' ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mazdoori Report ({workers.length})
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'daily' ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Breakdown ({dailyReportData.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
              placeholder="Search active report..."
              className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Report Content Table */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : activeTab === 'sales' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4 text-right">Labor (Mazdoori)</th>
                    <th className="py-2.5 px-4 text-right">Total Amount</th>
                    <th className="py-2.5 px-4 text-right">Paid</th>
                    <th className="py-2.5 px-4 text-right">Balance</th>
                    <th className="py-2.5 px-4 text-center w-20 print:hidden">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No sales found for this filter.
                      </td>
                    </tr>
                  ) : (
                    paged(displayedSales).map((sale, i) => (
                      <tr key={sale.id || i} className={`hover:bg-slate-50/50 ${sale.cancelledAt ? 'opacity-60' : ''}`}>
                        <td className="py-2.5 px-3 text-center text-xs text-slate-500">{i + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 text-xs">
                          {sale.invoiceNumber}
                          {sale.cancelledAt && <span className="ml-1.5 text-[10px] font-bold uppercase text-red-600 bg-red-50 border border-red-200 rounded px-1.5">{sale.cancelReason?.startsWith('Updated:') ? 'Old Bill' : 'Cancelled'}</span>}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {sale.createdAt ? formatDate(sale.createdAt) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-900 font-semibold text-xs">
                          {sale.customerName || 'Cash Sale'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs text-teal-800 font-medium">
                          {formatPKR(sale.totalMazdoori || 0)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900 text-xs">
                          {formatPKR(sale.total)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs text-emerald-600 font-semibold">
                          {formatPKR(sale.paidAmount)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-bold text-xs ${
                            sale.remainingCredit > 0 ? 'text-red-600' : 'text-slate-400'
                          }`}
                        >
                          {formatPKR(sale.remainingCredit)}
                        </td>
                        <td className="py-2.5 px-4 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => handleViewInvoice(sale)}
                            className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-slate-400 transition-colors"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4 stroke-[2]" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'customer' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Customer Name</th>
                    <th className="py-2.5 px-4">Mobile</th>
                    <th className="py-2.5 px-4 text-right">Total Purchases</th>
                    <th className="py-2.5 px-4 text-right">Total Paid</th>
                    <th className="py-2.5 px-4 text-right">Amount Unpaid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged(displayedCustomers).map((cust, i) => (
                    <tr key={cust.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center text-xs text-slate-500">{i + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 text-xs">{cust.name}</td>
                      <td className="py-2.5 px-4 text-slate-600 text-xs">{cust.mobile}</td>
                      <td className="py-2.5 px-4 text-right text-xs font-medium text-slate-900">
                        {formatPKR(cust.totalPurchase)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-emerald-600 font-medium">
                        {formatPKR(cust.totalPaid)}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-bold text-xs ${
                          cust.balance > 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {formatPKR(cust.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'mazdoori' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Worker Name</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4 text-right">Total Work Done</th>
                    <th className="py-2.5 px-4 text-right">Total Paid Out</th>
                    <th className="py-2.5 px-4 text-right">Amount to Pay Worker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged(displayedWorkers).map((w, i) => (
                    <tr key={w.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center text-xs text-slate-500">{i + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 text-xs">{w.name}</td>
                      <td className="py-2.5 px-4 text-slate-600 text-xs">{w.phone || '-'}</td>
                      <td className="py-2.5 px-4 text-right text-xs font-medium text-slate-900">
                        {formatPKR(w.totalWork)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-emerald-600 font-medium">
                        {formatPKR(w.totalPaid)}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-bold text-xs ${
                          w.balance > 0 ? 'text-teal-800' : 'text-slate-500'
                        }`}
                      >
                        {formatPKR(w.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-center">Bills Count</th>
                    <th className="py-2.5 px-4 text-right">Total Turnover</th>
                    <th className="py-2.5 px-4 text-right">Collected Revenue</th>
                    <th className="py-2.5 px-4 text-right">Credit Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged(displayedDaily).map((d, i) => (
                    <tr key={d.date} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center text-xs text-slate-500">{i + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 text-xs">{d.date}</td>
                      <td className="py-2.5 px-4 text-center text-xs text-slate-700 font-semibold">{d.bills}</td>
                      <td className="py-2.5 px-4 text-right text-xs font-bold text-slate-900">
                        {formatPKR(d.total)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-emerald-600 font-semibold">
                        {formatPKR(d.received)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-red-600 font-semibold">
                        {formatPKR(d.credit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600 print:hidden"><span>{rowCount} records · Page {currentPage} of {maxPage}</span><div className="flex gap-2"><Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><Button variant="outline" disabled={currentPage >= maxPage} onClick={() => setPage(currentPage + 1)}>Next</Button></div></div>
      {/* Bill Preview Modal for Viewing Invoice Details */}
      <BillPreviewModal
        isOpen={!!selectedInvoice}
        data={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onNewBill={() => setSelectedInvoice(null)}
        onCancelled={() => setReloadKey(k => k + 1)}
      />
    </div>
  )
}
