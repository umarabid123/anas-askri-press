import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HardHat, Search } from 'lucide-react'
import { formatPKR, formatDate, localDateKey, roundMoney } from '@/utils/financial'
import { getSales, getCustomers } from '@/services/sqlite.service'
import { activeSales } from '@/utils/reports'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import { BillPreviewModal } from '@/features/billing/components/BillPreviewModal'
import type { ShopInvoiceData } from '@/features/billing/components/ShopInvoiceTemplate'
import { saleToInvoiceData } from '@/features/billing/invoice-data'
import type { Customer, Sale } from '@/types'

// Mazdoori is read from saved bills: every bill with labour, linked to its customer
export function MazdooriPage() {
  const navigate = useNavigate()
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedInvoice, setSelectedInvoice] = useState<ShopInvoiceData | null>(null)

  useEffect(() => {
    Promise.all([getSales(), getCustomers()])
      .then(([s, c]) => { setSales(s.filter((sale) => (sale.totalMazdoori || 0) > 0)); setCustomers(c) })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setIsLoading(false))
  }, [reloadKey])

  const query = searchTerm.toLowerCase()
  const filteredSales = sales.filter((sale) =>
    sale.invoiceNumber.toLowerCase().includes(query) ||
    (sale.customerName || 'cash sale').toLowerCase().includes(query) ||
    sale.items.some((item) => item.itemName.toLowerCase().includes(query))
  )

  // Totals count only valid (not cancelled) bills
  const counted = activeSales(sales)
  const sumMazdoori = (rows: Sale[]) => roundMoney(rows.reduce((sum, sale) => sum + (sale.totalMazdoori || 0), 0))
  const today = localDateKey()
  const totalMazdoori = sumMazdoori(counted)
  const monthMazdoori = sumMazdoori(counted.filter((sale) => localDateKey(sale.createdAt).slice(0, 7) === today.slice(0, 7)))
  const todayMazdoori = sumMazdoori(counted.filter((sale) => localDateKey(sale.createdAt) === today))

  return (
    <div className="space-y-4 h-full flex flex-col justify-between">
      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex-1 flex flex-col">
        {/* Title & Search Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 leading-tight">Mazdoori (Labor Ledger)</h1>
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
                        <p className="text-xs mt-1">Bills saved with a Mazdoori amount appear here automatically.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale, index) => (
                      <tr
                        key={sale.id}
                        onClick={() => setSelectedInvoice(saleToInvoiceData(sale, customers.find((c) => c.id === sale.customerId)))}
                        className={cn('hover:bg-slate-50/50 cursor-pointer', sale.cancelledAt && 'opacity-60')}
                        title="View invoice"
                      >
                        <td className="py-3 px-3 text-center text-xs font-medium text-slate-500">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                          {formatDate(sale.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 text-xs whitespace-nowrap">
                          {sale.invoiceNumber}
                          {sale.cancelledAt && <span className="ml-1.5 text-[10px] font-bold uppercase text-red-600 bg-red-50 border border-red-200 rounded px-1.5">Cancelled</span>}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {sale.customerId ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigate(ROUTES.CUSTOMER_DETAIL.replace(':id', sale.customerId!)) }}
                              className="font-semibold text-slate-900 hover:text-purple-600 text-left transition-colors"
                            >
                              {sale.customerName}
                            </button>
                          ) : (
                            <span className="font-semibold text-slate-500">{sale.customerName || 'Cash Sale'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700">
                          {sale.items.filter((item) => item.mazdoori > 0).map((item) => (
                            <p key={item.id}>
                              <span className="font-medium">{item.itemName}</span>: {formatPKR(item.mazdoori)}
                              {(item.mazdooriTasks || []).length > 0 && (
                                <span className="text-slate-400"> ({item.mazdooriTasks!.map((task) => task.title + (task.workerName ? ' – ' + task.workerName : '')).join(', ')})</span>
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
