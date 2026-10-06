import { useState, useEffect, useMemo } from 'react'
import {
  Eye,
  HardHat,
  Printer,
  Search,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatPKR, parseDate, formatDate } from '@/utils/financial'
import { getSales, getCustomers, getMazdoors } from '@/services/sqlite.service'
import { BillPreviewModal } from '@/features/billing/components/BillPreviewModal'
import type { ShopInvoiceData } from '@/features/billing/components/ShopInvoiceTemplate'
import type { Sale, Customer, Mazdoor } from '@/types'

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'customer' | 'mazdoori' | 'daily'>('sales')
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [workers, setWorkers] = useState<Mazdoor[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter states
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // View details modal
  const [selectedInvoice, setSelectedInvoice] = useState<ShopInvoiceData | null>(null)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [salesData, customersData, workersData] = await Promise.all([
          getSales(500),
          getCustomers(),
          getMazdoors(),
        ])
        setSales(salesData)
        setCustomers(customersData)
        setWorkers(workersData)
      } catch (err) {
        console.error('Failed to load reports data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Filter sales by date preset
  const filteredSales = useMemo(() => {
    const now = new Date()
    return sales.filter((sale) => {
      if (datePreset === 'all') return true
      const saleDate = parseDate(sale.createdAt)

      if (datePreset === 'today') {
        return saleDate.toDateString() === now.toDateString()
      }
      if (datePreset === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return saleDate >= weekAgo
      }
      if (datePreset === 'month') {
        return (
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        )
      }
      return true
    })
  }, [sales, datePreset])

  // Summary Metrics
  const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0)
  const totalReceived = filteredSales.reduce((acc, s) => acc + (s.paidAmount || 0), 0)
  const totalCustomerReceivables = customers.reduce((acc, c) => acc + (c.balance || 0), 0)
  const totalMazdooriLiability = workers.reduce((acc, w) => acc + (w.balance || 0), 0)

  // Aggregated Daily Report
  const dailyReportData = useMemo(() => {
    const map = new Map<string, { date: string; bills: number; total: number; received: number; credit: number }>()

    for (const sale of filteredSales) {
      const dateKey = sale.createdAt ? parseDate(sale.createdAt).toISOString().slice(0, 10) : 'Unknown'
      const existing = map.get(dateKey) || { date: dateKey, bills: 0, total: 0, received: 0, credit: 0 }
      existing.bills += 1
      existing.total += sale.total
      existing.received += sale.paidAmount
      existing.credit += sale.remainingCredit
      map.set(dateKey, existing)
    }

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date))
  }, [filteredSales])

  // Handle invoice view details
  const handleViewInvoice = (sale: Sale) => {
    setSelectedInvoice({
      invoiceNumber: sale.invoiceNumber,
      date: sale.createdAt,
      customerName: sale.customerName || '',
      customerPhone: sale.customerMobile || '',
      items: sale.items || [],
      subtotal: sale.subtotal || sale.total,
      totalMazdoori: sale.totalMazdoori || 0,
      discount: sale.discount || 0,
      total: sale.total,
      paidAmount: sale.paidAmount,
      remainingCredit: sale.remainingCredit,
      paymentMethod: sale.paymentMethod,
    })
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

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 leading-tight">Financial Reports</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Audit business revenue, customer receivables, daily turnovers, and labor costs
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Preset Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setDatePreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                datePreset === 'all' ? 'bg-[#1877F2] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDatePreset('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                datePreset === 'today' ? 'bg-[#1877F2] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDatePreset('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                datePreset === 'week' ? 'bg-[#1877F2] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDatePreset('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                datePreset === 'month' ? 'bg-[#1877F2] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
          </div>

          {/* Print / Export Report */}
          <Button
            onClick={() => window.print()}
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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900">{formatPKR(totalRevenue)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{filteredSales.length} Total Invoices</p>
        </div>

        {/* Card 2: Received Cash/Bank */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payments Received</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-600">{formatPKR(totalReceived)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Collected Revenue</p>
        </div>

        {/* Card 3: Receivables (Credit Owed by Customers) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Client Receivables</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <p className="text-xl font-black text-red-600">{formatPKR(totalCustomerReceivables)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Pending from Customers</p>
        </div>

        {/* Card 4: Mazdoori Liability (Owed to Workers) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Labor Liability</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <HardHat className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <p className="text-xl font-black text-purple-700">{formatPKR(totalMazdooriLiability)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Owed to Craftsmen/Workers</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col min-h-[460px]">
        {/* Navigation Tabs and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'sales' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sales Report ({filteredSales.length})
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'customer' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer Balances ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('mazdoori')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'mazdoori' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mazdoori Report ({workers.length})
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'daily' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
              onChange={(e) => setSearchTerm(e.target.value)}
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
                  <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4 text-right">Labor (Mazdoori)</th>
                    <th className="py-2.5 px-4 text-right">Total Amount</th>
                    <th className="py-2.5 px-4 text-right">Paid</th>
                    <th className="py-2.5 px-4 text-right">Balance</th>
                    <th className="py-2.5 px-4 text-center w-20">View</th>
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
                    displayedSales.map((sale, i) => (
                      <tr key={sale.id || i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center text-xs text-slate-500">{i + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 text-xs">{sale.invoiceNumber}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {sale.createdAt ? formatDate(sale.createdAt) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-900 font-semibold text-xs">
                          {sale.customerName || 'Cash Sale'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs text-purple-700 font-medium">
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
                        <td className="py-2.5 px-4 text-center">
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
                  <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Customer Name</th>
                    <th className="py-2.5 px-4">Mobile</th>
                    <th className="py-2.5 px-4 text-right">Total Purchases</th>
                    <th className="py-2.5 px-4 text-right">Total Paid</th>
                    <th className="py-2.5 px-4 text-right">Receivable Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedCustomers.map((cust, i) => (
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
                  <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Worker / Partner Name</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4 text-right">Total Work Done</th>
                    <th className="py-2.5 px-4 text-right">Total Paid Out</th>
                    <th className="py-2.5 px-4 text-right">Outstanding Liability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedWorkers.map((w, i) => (
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
                          w.balance > 0 ? 'text-purple-700' : 'text-slate-500'
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
                  <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-center">Bills Count</th>
                    <th className="py-2.5 px-4 text-right">Total Turnover</th>
                    <th className="py-2.5 px-4 text-right">Collected Revenue</th>
                    <th className="py-2.5 px-4 text-right">Credit Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedDaily.map((d, i) => (
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

      {/* Bill Preview Modal for Viewing Invoice Details */}
      <BillPreviewModal
        isOpen={!!selectedInvoice}
        data={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onNewBill={() => setSelectedInvoice(null)}
      />
    </div>
  )
}
