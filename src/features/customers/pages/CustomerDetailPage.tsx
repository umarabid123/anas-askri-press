import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  DollarSign,
  Edit,
  FilePlus,
  Printer,
  Search,
  Wallet,
  ShoppingBag,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatPKR, formatDate } from '@/utils/financial'
import { cn } from '@/utils/cn'
import {
  getCustomerById,
  getCustomerLedger,
  updateCustomer,
  receivePayment,
  getSales,
} from '@/services/sqlite.service'
import { startNewBill } from '@/features/billing/bill-actions'
import { toast } from '@/stores/toast.store'
import { ROUTES } from '@/constants/routes'
import { EditCustomerModal } from '../components/EditCustomerModal'
import { ReceivePaymentModal } from '../components/ReceivePaymentModal'
import { CustomerStatementModal } from '../components/CustomerStatementModal'
import { BillPreviewModal } from '@/features/billing/components/BillPreviewModal'
import type { ShopInvoiceData } from '@/features/billing/components/ShopInvoiceTemplate'
import { saleToInvoiceData } from '@/features/billing/invoice-data'
import { billStatus, ledgerEntryStatus } from '../entry-status'
import type { Customer, CustomerLedgerEntry, Sale } from '@/types'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [ledger, setLedger] = useState<CustomerLedgerEntry[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [activeTab, setActiveTab] = useState<'ledger' | 'invoices'>('ledger')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isStatementOpen, setIsStatementOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<ShopInvoiceData | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const [cust, ledg, allSales] = await Promise.all([
        getCustomerById(id),
        getCustomerLedger(id),
        getSales(),
      ])
      setCustomer(cust)
      setLedger(ledg)
      setSales(allSales.filter((s) => s.customerId === id))
    } catch (err) {
      console.error('Failed to load customer details:', err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleNewBill = () => {
    if (!customer) return
    if (startNewBill(customer)) navigate(ROUTES.NEW_BILL)
  }

  const handleUpdateCustomer = async (updated: Customer) => {
    const res = await updateCustomer(updated)
    setCustomer(res)
    return res
  }

  const handleReceivePayment = async (data: {
    customerId: string
    amount: number
    paymentMethod: string
    notes?: string
  }) => {
    const paymentId = await receivePayment(data)
    await loadData()
    return paymentId
  }

  // Open an invoice (from a ledger row or the invoices tab) in the bill preview popup
  const handleViewInvoice = (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId)
    if (!sale) { toast.error('Bill not found. Refresh the list and try again.'); return }
    setSelectedInvoice(saleToInvoiceData(sale, customer))
  }

  const filteredLedger = ledger.filter((entry) =>
    entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.date.includes(searchQuery)
  )
  const filteredSales = sales.filter((sale) =>
    sale.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.createdAt.includes(searchQuery)
  )

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-12">
        <h2 className="text-lg font-bold text-slate-900">Customer Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          The customer record you requested could not be located in local storage or database.
        </p>
        <Button onClick={() => navigate('/customers')} className="flex items-center gap-2 mx-auto">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 flex flex-col h-full">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/customers')}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              title="Back to Customers"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
                <Badge variant={customer.syncStatus === 'synced' ? 'success' : 'warning'}>
                  {customer.syncStatus === 'synced' ? 'Synced' : 'Pending Sync'}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Mobile: <span className="font-semibold text-slate-700">{customer.mobile}</span>
                {customer.address && ` • ${customer.address}`}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleNewBill}
              className="bg-[#1877F2] hover:bg-blue-600 flex items-center gap-1.5 shadow-xs"
            >
              <FilePlus className="w-4 h-4 stroke-[2.5]" />
              <span>New Bill</span>
            </Button>
            <Button
              onClick={() => setIsPaymentOpen(true)}
              variant="outline"
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
              <span>Receive Payment</span>
            </Button>
            <Button
              onClick={() => setIsStatementOpen(true)}
              variant="outline"
              className="flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 stroke-[2]" />
              <span>Statement</span>
            </Button>
            <Button
              onClick={() => setIsEditOpen(true)}
              variant="outline"
              className="flex items-center gap-1.5"
            >
              <Edit className="w-4 h-4 stroke-[2]" />
              <span>Edit</span>
            </Button>
          </div>
        </div>

        {/* 3 Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Purchases</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {formatPKR(customer.totalPurchase)}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Paid</p>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">
                {formatPKR(customer.totalPaid)}
              </p>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border flex items-center gap-3.5 ${
              customer.balance > 0
                ? 'bg-red-50/70 border-red-200/90 text-red-900'
                : 'bg-emerald-50/70 border-emerald-200/90 text-emerald-900'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                customer.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">Current Balance (Credit)</p>
              <p className="text-lg font-black mt-0.5">
                {formatPKR(customer.balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Section Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600 stroke-[2.2]" />
              <h2 className="text-base font-bold text-slate-900">Account Ledger & Transaction History</h2>
            </div>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
              {([['ledger', `Ledger (${ledger.length})`], ['invoices', `Invoices (${sales.length})`]] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                    activeTab === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Search ledger */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={activeTab === 'ledger' ? 'Search ledger entries...' : 'Search invoice number...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Ledger Table */}
        {activeTab === 'ledger' ? (
        <div className="border border-slate-200/90 rounded-xl overflow-hidden flex-1">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4 text-right">Debit (+)</th>
                <th className="py-2.5 px-4 text-right">Credit (-)</th>
                <th className="py-2.5 px-4 text-right">Running Balance</th>
                <th className="py-2.5 px-4 text-center w-36">Entry Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-sm">No transaction records found</p>
                    <p className="text-xs mt-1">Transactions will appear automatically when bills or payments are saved.</p>
                  </td>
                </tr>
              ) : (
                filteredLedger.map((entry, index) => {
                  const saleId = entry.saleId
                  const status = ledgerEntryStatus(entry, sales)
                  return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-slate-50/50 ${saleId ? 'cursor-pointer' : ''}`}
                    onClick={saleId ? () => handleViewInvoice(saleId) : undefined}
                    title={saleId ? 'View invoice' : undefined}
                  >
                    <td className="py-3 px-3 text-center text-xs font-medium text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                      {entry.date ? formatDate(entry.date) : '-'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 text-sm">
                      {entry.description}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 text-sm">
                      {entry.debit > 0 ? `Rs ${entry.debit.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600 text-sm">
                      {entry.credit > 0 ? `Rs ${entry.credit.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      Rs {entry.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={status.variant} title={status.detail} className="whitespace-nowrap">
                        {status.label}
                      </Badge>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        ) : (
        /* Invoices Table */
        <div className="border border-slate-200/90 rounded-xl overflow-hidden flex-1">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 text-right">Total</th>
                <th className="py-2.5 px-4 text-right">Paid</th>
                <th className="py-2.5 px-4 text-right">Balance</th>
                <th className="py-2.5 px-4 text-center w-36">Bill Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-sm">No invoices found</p>
                    <p className="text-xs mt-1">Bills saved for this customer appear here.</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale, index) => (
                  <tr
                    key={sale.id}
                    className={cn('hover:bg-slate-50/50 cursor-pointer', sale.cancelledAt && 'opacity-60')}
                    onClick={() => handleViewInvoice(sale.id)}
                    title="View invoice"
                  >
                    <td className="py-3 px-3 text-center text-xs font-medium text-slate-500">{index + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800 text-sm">{sale.invoiceNumber}</td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 text-sm">{formatPKR(sale.total)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600 text-sm">{formatPKR(sale.paidAmount)}</td>
                    <td className="py-3 px-4 text-right font-bold text-sm text-slate-900">{formatPKR(sale.remainingCredit)}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={billStatus(sale).variant} title={billStatus(sale).detail} className="whitespace-nowrap">{billStatus(sale).label}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Modals */}
      <EditCustomerModal
        isOpen={isEditOpen}
        customer={customer}
        onClose={() => setIsEditOpen(false)}
        onUpdate={handleUpdateCustomer}
      />

      <ReceivePaymentModal
        isOpen={isPaymentOpen}
        customer={customer}
        onClose={() => setIsPaymentOpen(false)}
        onSubmit={handleReceivePayment}
      />

      <CustomerStatementModal
        isOpen={isStatementOpen}
        customer={customer}
        ledger={ledger}
        onClose={() => setIsStatementOpen(false)}
      />

      <BillPreviewModal
        isOpen={!!selectedInvoice}
        data={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onNewBill={() => { setSelectedInvoice(null); handleNewBill() }}
        onCancelled={loadData}
      />
    </div>
  )
}
