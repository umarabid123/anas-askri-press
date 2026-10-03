import { useState } from 'react'
import {
  Calendar,
  ChevronDown,
  CircleDollarSign,
  Eye,
  HardHat,
  PieChart,
  ShoppingCart,
} from 'lucide-react'

interface SalesReportRow {
  id: string
  date: string
  totalItems: number
  totalAmount: number
  received: number
  credit: number
}

const SALES_REPORT_DATA: SalesReportRow[] = [
  { id: '1', date: '12 Sep 2025', totalItems: 4, totalAmount: 11950, received: 0, credit: 11950 },
  { id: '2', date: '11 Sep 2025', totalItems: 6, totalAmount: 24500, received: 20000, credit: 4500 },
  { id: '3', date: '10 Sep 2025', totalItems: 3, totalAmount: 8400, received: 8400, credit: 0 },
  { id: '4', date: '09 Sep 2025', totalItems: 5, totalAmount: 16200, received: 10200, credit: 6000 },
  { id: '5', date: '08 Sep 2025', totalItems: 2, totalAmount: 7500, received: 7500, credit: 0 },
]

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'customer' | 'mazdoori' | 'daily'>('sales')

  return (
    <div className="space-y-4 h-full flex flex-col justify-between">
      <div className="space-y-4 flex-1 flex flex-col">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 leading-tight">Reports</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Apne kaam ka poora hisaab dekho</p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-slate-700 text-sm font-medium shadow-2xs cursor-pointer hover:border-slate-400 transition-colors">
            <Calendar className="w-4 h-4 text-slate-500 stroke-[2.2]" />
            <span>01 Sep 2025 - 12 Sep 2025</span>
            <ChevronDown className="w-4 h-4 text-slate-400 stroke-[2.2] ml-1" />
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Sales */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-slate-500 leading-tight">Total Sales</p>
              <p className="text-[19px] font-bold text-emerald-600 leading-tight mt-0.5">
                Rs 371,500
              </p>
            </div>
          </div>

          {/* Card 2: Total Received */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CircleDollarSign className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-slate-500 leading-tight">Total Received</p>
              <p className="text-[19px] font-bold text-[#1877F2] leading-tight mt-0.5">
                Rs 308,500
              </p>
            </div>
          </div>

          {/* Card 3: Total Credit */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <PieChart className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-slate-500 leading-tight">Total Credit</p>
              <p className="text-[19px] font-bold text-red-600 leading-tight mt-0.5">
                Rs 63,000
              </p>
            </div>
          </div>

          {/* Card 4: Total Mazdoori */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <HardHat className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-slate-500 leading-tight">Total Mazdoori</p>
              <p className="text-[19px] font-bold text-purple-600 leading-tight mt-0.5">
                Rs 10,200
              </p>
            </div>
          </div>
        </div>

        {/* Main Reports Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex-1 flex flex-col">
          {/* Tabs bar */}
          <div className="flex items-center gap-6 border-b border-slate-200 mb-4 pb-0 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'sales'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Sales Report
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('customer')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'customer'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer Report
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mazdoori')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'mazdoori'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Mazdoori Report
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'daily'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Report
            </button>
          </div>

          {/* Table */}
          <div className="border border-slate-200/90 rounded-xl overflow-hidden flex-1">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-center">Total Items</th>
                  <th className="py-2.5 px-4 text-center">Total Amount</th>
                  <th className="py-2.5 px-4 text-center">Received</th>
                  <th className="py-2.5 px-4 text-center">Credit</th>
                  <th className="py-2.5 px-4 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SALES_REPORT_DATA.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-700 text-sm font-medium">{row.date}</td>
                    <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                      {row.totalItems}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                      {row.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                      {row.received.toLocaleString()}
                    </td>
                    <td
                      className={`py-3 px-4 text-center font-bold text-sm ${
                        row.credit > 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {row.credit.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        className="text-slate-600 hover:text-blue-600 transition-colors p-1"
                        title="View Sale Details"
                      >
                        <Eye className="w-4 h-4 stroke-[2]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
