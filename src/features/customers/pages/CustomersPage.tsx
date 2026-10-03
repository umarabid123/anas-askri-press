import { useState } from 'react'
import { Eye, Pencil, Plus, Search, Users } from 'lucide-react'

interface CustomerRow {
  id: string
  name: string
  mobile: string
  totalPurchase: number
  paid: number
  credit: number
}

const INITIAL_CUSTOMERS: CustomerRow[] = [
  { id: '1', name: 'Ahmad Khan', mobile: '0300 1234567', totalPurchase: 125000, paid: 100000, credit: 25000 },
  { id: '2', name: 'Bilal Press', mobile: '0311 2345678', totalPurchase: 85500, paid: 85500, credit: 0 },
  { id: '3', name: 'Rehman CNC', mobile: '0321 3456789', totalPurchase: 62000, paid: 40000, credit: 22000 },
  { id: '4', name: 'Zeeshan', mobile: '0309 8765432', totalPurchase: 48000, paid: 48000, credit: 0 },
  { id: '5', name: 'Imran', mobile: '0333 1122334', totalPurchase: 36000, paid: 20000, credit: 16000 },
  { id: '6', name: 'Cash Customer', mobile: '-', totalPurchase: 15000, paid: 15000, credit: 0 },
]

export function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const customers = INITIAL_CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm)
  )

  const totalCustomers = INITIAL_CUSTOMERS.length
  const totalPurchase = INITIAL_CUSTOMERS.reduce((s, c) => s + c.totalPurchase, 0)
  const totalPaid = INITIAL_CUSTOMERS.reduce((s, c) => s + c.paid, 0)
  const totalCredit = INITIAL_CUSTOMERS.reduce((s, c) => s + c.credit, 0)

  return (
    <div className="space-y-4 h-full flex flex-col justify-between">
      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex-1 flex flex-col">
        {/* Title & Action Row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 leading-tight">Customers</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Apne Customers ka Record yahan rakho</p>
          </div>
          <button
            type="button"
            className="h-10 px-4 bg-[#1877F2] hover:bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Customer</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <Search className="w-4 h-4 stroke-[2.2]" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or mobile number..."
            className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200/90 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Customer Table */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden flex-1">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Mobile</th>
                <th className="py-2.5 px-4 text-center">Total Purchase</th>
                <th className="py-2.5 px-4 text-center">Paid</th>
                <th className="py-2.5 px-4 text-center">Credit (Balance)</th>
                <th className="py-2.5 px-4 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer, index) => (
                <tr key={customer.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 text-center text-xs font-medium text-slate-600">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 text-sm">
                    {customer.name}
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-sm font-medium">
                    {customer.mobile}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {customer.totalPurchase.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {customer.paid.toLocaleString()}
                  </td>
                  <td
                    className={`py-3 px-4 text-center font-bold text-sm ${
                      customer.credit > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {customer.credit.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-3 text-slate-600">
                      <button
                        type="button"
                        className="hover:text-blue-600 transition-colors"
                        title="View Ledger"
                      >
                        <Eye className="w-4 h-4 stroke-[2]" />
                      </button>
                      <button
                        type="button"
                        className="hover:text-blue-600 transition-colors"
                        title="Edit Customer"
                      >
                        <Pencil className="w-4 h-4 stroke-[2]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 px-8 py-3.5 shadow-xs flex items-center justify-between shrink-0">
        {/* Total Customers */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center">
            <Users className="w-5 h-5 fill-white stroke-none" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Customers</p>
            <p className="text-[20px] font-bold text-slate-900 leading-tight">{totalCustomers}</p>
          </div>
        </div>

        {/* Total Purchase */}
        <div className="text-center">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Purchase</p>
          <p className="text-[20px] font-bold text-emerald-600 leading-tight">
            Rs {totalPurchase.toLocaleString()}
          </p>
        </div>

        {/* Total Paid */}
        <div className="text-center">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Paid</p>
          <p className="text-[20px] font-bold text-emerald-600 leading-tight">
            Rs {totalPaid.toLocaleString()}
          </p>
        </div>

        {/* Total Credit */}
        <div className="text-right">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Credit</p>
          <p className="text-[20px] font-bold text-red-600 leading-tight">
            Rs {totalCredit.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
