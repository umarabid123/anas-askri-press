import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useCustomers } from '@/hooks/useCustomers'
import { formatPKR } from '@/utils/financial'
import { AddCustomerModal } from '../components/AddCustomerModal'
import { EditCustomerModal } from '../components/EditCustomerModal'
import { ReceivePaymentModal } from '../components/ReceivePaymentModal'
import type { Customer } from '@/types'

const PAGE_SIZE = 10

export function CustomersPage() {
  const navigate = useNavigate()
  const {
    customers,
    isLoading,
    error,
    addCustomer,
    editCustomer,
    removeCustomer,
    recordPayment,
  } = useCustomers()

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Reset pagination on search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    )
  }, [customers, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE))
  const validPage = Math.min(currentPage, totalPages)
  const paginatedCustomers = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE
    return filteredCustomers.slice(start, start + PAGE_SIZE)
  }, [filteredCustomers, validPage])

  const totalCustomers = customers.length
  const totalPurchase = customers.reduce((s, c) => s + (c.totalPurchase || 0), 0)
  const totalPaid = customers.reduce((s, c) => s + (c.totalPaid || 0), 0)
  const totalCredit = customers.reduce((s, c) => s + (c.balance || 0), 0)

  const handleDeleteConfirm = async () => {
    if (!deletingCustomer) return
    setDeleteError(null)
    try {
      await removeCustomer(deletingCustomer.id)
      setDeletingCustomer(null)
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete customer.')
    }
  }

  return (
    <div className="min-h-full flex flex-col gap-4">
      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex-1 flex flex-col">
        {/* Title & Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-tight">Customers</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Manage client records, receivables, and transaction ledgers
            </p>
          </div>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-blue-700 hover:bg-blue-800 flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Customer</span>
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <Search className="w-4 h-4 stroke-[2.2]" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, mobile, or address..."
            className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200/90 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Customer Table */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="animate-spin w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Mobile</th>
                    <th className="py-2.5 px-4">Address</th>
                    <th className="py-2.5 px-4 text-right">Total Purchase</th>
                    <th className="py-2.5 px-4 text-right">Paid</th>
                    <th className="py-2.5 px-4 text-right">Credit (Balance)</th>
                    <th className="py-2.5 px-4 text-center w-64">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <p className="font-semibold text-sm">No customers found</p>
                        <p className="text-xs mt-1">
                          {searchTerm
                            ? 'No customers match your search criteria.'
                            : 'Click "Add Customer" to create your first customer record.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((customer, index) => (
                      <tr key={customer.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center text-xs font-medium text-slate-500">
                          {(validPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            className="font-semibold text-blue-800 text-sm underline decoration-blue-200 underline-offset-4 hover:decoration-blue-700 text-left transition-colors cursor-pointer"
                          >
                            {customer.name}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-sm font-medium">
                          {customer.mobile}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-sm min-w-48 max-w-xs whitespace-normal break-words">
                          {customer.address?.trim() || 'Not added'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-800 font-semibold text-sm">
                          {formatPKR(customer.totalPurchase)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-800 font-semibold text-sm">
                          {formatPKR(customer.totalPaid)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold text-sm ${
                            customer.balance > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatPKR(customer.balance)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-semibold">
                            <button
                              type="button"
                              onClick={() => setPaymentCustomer(customer)}
                              className="px-2.5 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Receive Payment"
                            >
                              Receive
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/customers/${customer.id}`)}
                              className="px-2.5 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                              title="View Ledger & Statement"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCustomer(customer)}
                              className="px-2.5 py-2 text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Edit Customer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null)
                                setDeletingCustomer(customer)
                              }}
                              className="px-2.5 py-2 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                              title="Delete Customer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls Footer (10 records per page) */}
          {filteredCustomers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 bg-slate-50/60">
              <p className="text-xs text-slate-500 font-medium">
                Showing{' '}
                <span className="font-bold text-slate-800">
                  {(validPage - 1) * PAGE_SIZE + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-slate-800">
                  {Math.min(validPage * PAGE_SIZE, filteredCustomers.length)}
                </span>{' '}
                of{' '}
                <span className="font-bold text-slate-800">
                  {filteredCustomers.length}
                </span>{' '}
                customers
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
          )}
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 px-8 py-3.5 shadow-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center">
            <Users className="w-5 h-5 fill-white stroke-none" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Customers</p>
            <p className="text-[20px] font-bold text-slate-900 leading-tight">{totalCustomers}</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Purchase</p>
          <p className="text-[20px] font-bold text-slate-900 leading-tight">
            {formatPKR(totalPurchase)}
          </p>
        </div>

        <div className="text-center">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Paid</p>
          <p className="text-[20px] font-bold text-emerald-600 leading-tight">
            {formatPKR(totalPaid)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Customer Dues (Udhaar)</p>
          <p className="text-[20px] font-bold text-red-600 leading-tight">
            {formatPKR(totalCredit)}
          </p>
        </div>
      </div>

      {/* Modals */}
      <AddCustomerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={addCustomer}
      />

      <EditCustomerModal
        isOpen={!!editingCustomer}
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onUpdate={editCustomer}
      />

      <ReceivePaymentModal
        isOpen={!!paymentCustomer}
        customer={paymentCustomer}
        onClose={() => setPaymentCustomer(null)}
        onSubmit={recordPayment}
      />

      <ConfirmDialog
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer"
        description={
          deleteError
            ? deleteError
            : `Are you sure you want to delete "${deletingCustomer?.name}"? If this customer has existing sales or transactions, deletion will be blocked to maintain audit integrity.`
        }
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
