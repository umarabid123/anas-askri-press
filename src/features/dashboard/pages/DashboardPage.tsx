import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, ShoppingCart, Users, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
import { ROUTES } from '@/constants/routes'
import { getSales, getPayments, getCustomers, type Receipt as Payment } from '@/services/sqlite.service'
import { formatPKR, formatDate, localDateKey, roundMoney } from '@/utils/financial'
import { activeSales, activePayments } from '@/utils/reports'
import { BillPreviewModal } from '@/features/billing/components/BillPreviewModal'
import type { ShopInvoiceData } from '@/features/billing/components/ShopInvoiceTemplate'
import { saleToInvoiceData } from '@/features/billing/invoice-data'
import { startNewBill } from '@/features/billing/bill-actions'
import type { Customer, Sale } from '@/types'

interface DashboardData { sales: Sale[]; payments: Payment[]; customers: Customer[] }

export function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedInvoice, setSelectedInvoice] = useState<ShopInvoiceData | null>(null)

  useEffect(() => {
    Promise.all([getSales(), getPayments(), getCustomers()])
      .then(([sales, payments, customers]) => setData({ sales, payments, customers }))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [reloadKey])

  if (error) return <div role="alert" className="p-3 bg-red-50 text-red-700 rounded-xl">{error}</div>
  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const today = localDateKey()
  const todaySales = activeSales(data.sales).filter((s) => localDateKey(s.createdAt) === today)
  const receivedToday = roundMoney(activePayments(data.payments, data.sales).filter((p) => localDateKey(p.paymentDate) === today).reduce((sum, p) => sum + p.amount, 0))
  const debtors = data.customers.filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance)
  const receivables = roundMoney(debtors.reduce((sum, c) => sum + c.balance, 0))
  const recentInvoices = data.sales.slice(0, 6)

  const openInvoice = (sale: Sale) => {
    setSelectedInvoice(saleToInvoiceData(sale, data.customers.find((c) => c.id === sale.customerId)))
  }

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 leading-tight">Home</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Today's summary · {formatDate(today + 'T00:00:00')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => { if (startNewBill()) navigate(ROUTES.NEW_BILL) }} className="bg-[#1877F2] hover:bg-blue-600 flex items-center gap-1.5" title="Shortcut: F2">
            <FilePlus className="w-4 h-4 stroke-[2.5]" />
            <span>New Bill</span>
            <kbd className="ml-1 text-[10px] font-semibold bg-white/20 rounded px-1.5 py-0.5">F2</kbd>
          </Button>
        </div>
      </div>

      {/* Today's numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatPKR(roundMoney(todaySales.reduce((sum, s) => sum + s.total, 0)))}
          subtitle={`${todaySales.length} bill${todaySales.length === 1 ? '' : 's'}`}
          variant="blue"
          icon={<ShoppingCart className="w-5 h-5" />}
          onClick={() => navigate(ROUTES.REPORTS)}
        />
        <StatCard
          title="Received Today"
          value={formatPKR(receivedToday)}
          subtitle="Cash + bank, incl. old dues"
          variant="green"
          icon={<Wallet className="w-5 h-5" />}
          onClick={() => navigate(ROUTES.REPORTS)}
        />
        <StatCard
          title="Customer Dues (Udhaar)"
          value={formatPKR(receivables)}
          subtitle={`${debtors.length} customer${debtors.length === 1 ? '' : 's'} owe`}
          variant="amber"
          icon={<Users className="w-5 h-5" />}
          onClick={() => navigate(ROUTES.CUSTOMERS)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top receivables */}
        {/* <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-3">Highest Balances</h2>
          {debtors.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No customer owes anything.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {debtors.slice(0, 5).map((customer, index) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="w-full flex items-center justify-between gap-3 py-2.5 px-2 rounded-lg hover:bg-slate-50 text-left"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-xs font-semibold text-slate-400">{index + 1}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 truncate">{customer.name}</span>
                        <span className="block text-xs text-slate-500">{customer.mobile}</span>
                      </span>
                    </span>
                    <span className="text-sm font-bold text-red-600 shrink-0">{formatPKR(customer.balance)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div> */}

        {/* Recent invoices */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-3">Recent Invoices</h2>
          {recentInvoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No invoices yet. Press F2 to create one.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentInvoices.map((sale) => (
                <li key={sale.id}>
                  <button
                    type="button"
                    onClick={() => openInvoice(sale)}
                    className="w-full flex items-center justify-between gap-3 py-2.5 px-2 rounded-lg hover:bg-slate-50 text-left"
                    title="View invoice"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        {sale.invoiceNumber}
                        {sale.cancelledAt && <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 border border-red-200 rounded px-1.5">{sale.cancelReason?.startsWith('Updated:') ? 'Old Bill' : 'Cancelled'}</span>}
                      </span>
                      <span className="block text-xs text-slate-500 truncate">{sale.customerName || 'Cash Sale'} · {formatDate(sale.createdAt)}</span>
                    </span>
                    <span className={`text-sm font-bold shrink-0 ${sale.cancelledAt ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{formatPKR(sale.total)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
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
