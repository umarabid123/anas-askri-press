import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Printer } from 'lucide-react'
import { formatPKR, formatDate } from '@/utils/financial'
import type { Customer, CustomerLedgerEntry } from '@/types'

interface CustomerStatementModalProps {
  isOpen: boolean
  customer: Customer | null
  ledger: CustomerLedgerEntry[]
  onClose: () => void
}

export function CustomerStatementModal({
  isOpen,
  customer,
  ledger,
  onClose,
}: CustomerStatementModalProps) {
  if (!customer) return null

  const handlePrint = () => {
    window.print()
  }

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Account Statement"
      size="lg"
    >
      <div className="space-y-6">
        {/* Printable Statement Area */}
        <div id="customer-statement-print" className="bg-white p-6 border border-slate-200 rounded-xl space-y-5 print:border-none print:p-0">
          {/* Business Header */}
          <div className="border-b border-slate-200 pb-4 text-center">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">ARKI PRESS & CNC SHOP</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Chadar • Dabi • Chogat • Laser Cutting • CNC Cutting
            </p>
            <p className="text-xs font-semibold text-slate-700 mt-1">ACCOUNT STATEMENT</p>
          </div>

          {/* Customer & Statement Meta */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100">
            <div>
              <p className="text-slate-500 font-medium">Customer Name:</p>
              <p className="text-sm font-bold text-slate-900">{customer.name}</p>
              <p className="text-slate-500 mt-1">Mobile: <span className="font-semibold text-slate-700">{customer.mobile}</span></p>
              {customer.address && (
                <p className="text-slate-500">Address: <span className="text-slate-700">{customer.address}</span></p>
              )}
            </div>
            <div className="text-right">
              <p className="text-slate-500 font-medium">Statement Date:</p>
              <p className="text-sm font-bold text-slate-900">{currentDate}</p>
              <div className="mt-2 inline-block text-left bg-white border border-slate-200 rounded p-1.5 text-xs">
                <span className="text-slate-500">Current Balance: </span>
                <span className={`font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatPKR(customer.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-right">Debit (Rs)</th>
                  <th className="py-2 px-3 text-right">Credit (Rs)</th>
                  <th className="py-2 px-3 text-right">Balance (Rs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                      No transaction history recorded yet.
                    </td>
                  </tr>
                ) : (
                  ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {entry.date ? formatDate(entry.date) : '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-800 font-medium">
                        {entry.description}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">
                        {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                        {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {entry.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                  <td colSpan={2} className="py-2 px-3 text-right">Summary Totals:</td>
                  <td className="py-2 px-3 text-right text-slate-900">
                    Rs {customer.totalPurchase.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-600">
                    Rs {customer.totalPaid.toLocaleString()}
                  </td>
                  <td className={`py-2 px-3 text-right ${customer.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    Rs {customer.balance.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer note */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
            <span>Generated from Arki POS System</span>
            <span>Customer Signature: ___________________</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            <span>Print Statement</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
