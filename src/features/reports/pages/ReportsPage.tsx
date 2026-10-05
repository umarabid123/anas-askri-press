import { useState } from 'react'
import {
  Calendar,
  ChevronDown,
  Eye,
  HardHat,
  PieChart,
  ShoppingCart,
} from 'lucide-react'
import { cn } from '@/utils/cn'

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

interface CustomerReportRow {
  id: string
  name: string
  totalOrders: number
  totalAmount: number
  received: number
  credit: number
}

const CUSTOMER_REPORT_DATA: CustomerReportRow[] = [
  { id: '1', name: 'Usman Metal Works', totalOrders: 8, totalAmount: 45000, received: 40000, credit: 5000 },
  { id: '2', name: 'Ali Iron Store', totalOrders: 12, totalAmount: 82500, received: 82500, credit: 0 },
  { id: '3', name: 'Bilal Steel Craft', totalOrders: 5, totalAmount: 29000, received: 20000, credit: 9000 },
  { id: '4', name: 'Rashid Workshop', totalOrders: 4, totalAmount: 18200, received: 18200, credit: 0 },
]

interface MazdooriReportRow {
  id: string
  name: string
  taskType: string
  totalTasks: number
  totalAmount: number
  received: number
  credit: number
}

const MAZDOORI_REPORT_DATA: MazdooriReportRow[] = [
  { id: '1', name: 'Aslam (Cutter)', taskType: 'Laser Cutting', totalTasks: 14, totalAmount: 12500, received: 10000, credit: 2500 },
  { id: '2', name: 'Tariq (Press)', taskType: 'Dabi Press', totalTasks: 22, totalAmount: 18000, received: 18000, credit: 0 },
  { id: '3', name: 'Imran (Bend)', taskType: 'Chadar Bending', totalTasks: 9, totalAmount: 8400, received: 6000, credit: 2400 },
]

interface DailyReportRow {
  id: string
  date: string
  totalBills: number
  totalAmount: number
  received: number
  credit: number
}

const DAILY_REPORT_DATA: DailyReportRow[] = [
  { id: '1', date: '12 Sep 2025', totalBills: 4, totalAmount: 11950, received: 0, credit: 11950 },
  { id: '2', date: '11 Sep 2025', totalBills: 6, totalAmount: 24500, received: 20000, credit: 4500 },
  { id: '3', date: '10 Sep 2025', totalBills: 3, totalAmount: 8400, received: 8400, credit: 0 },
  { id: '4', date: '09 Sep 2025', totalBills: 5, totalAmount: 16200, received: 10200, credit: 6000 },
  { id: '5', date: '08 Sep 2025', totalBills: 2, totalAmount: 7500, received: 7500, credit: 0 },
]

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'customer' | 'mazdoori' | 'daily'>('sales')

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 leading-tight">Reports</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Track financial performance, sales, and labor records</p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-slate-700 text-sm font-medium shadow-2xs cursor-pointer hover:border-slate-400 transition-colors">
          <Calendar className="w-4 h-4 text-slate-600 stroke-[2.2]" />
          <span>01 Sep 2025 - 12 Sep 2025</span>
          <ChevronDown className="w-4 h-4 text-slate-400 stroke-[2.2] ml-1" />
        </div>
      </div>

      {/* 4 Summary Stat Cards in a single row */}
      <div className="grid grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center gap-3.5 shadow-2xs min-w-0">
          <ShoppingCart className="w-8 h-8 text-emerald-600 fill-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-500 leading-tight truncate">Total Sales</p>
            <p className="text-[19px] font-bold text-emerald-600 leading-tight mt-0.5 truncate">
              Rs 371,500
            </p>
          </div>
        </div>

        {/* Card 2: Total Received */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center gap-3.5 shadow-2xs min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
            $
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-500 leading-tight truncate">Total Received</p>
            <p className="text-[19px] font-bold text-[#1877F2] leading-tight mt-0.5 truncate">
              Rs 308,500
            </p>
          </div>
        </div>

        {/* Card 3: Total Credit */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center gap-3.5 shadow-2xs min-w-0">
          <PieChart className="w-8 h-8 text-red-600 fill-red-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-500 leading-tight truncate">Total Credit</p>
            <p className="text-[19px] font-bold text-red-600 leading-tight mt-0.5 truncate">
              Rs 63,000
            </p>
          </div>
        </div>

        {/* Card 4: Total Mazdoori */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center gap-3.5 shadow-2xs min-w-0">
          <HardHat className="w-8 h-8 text-[#8B5CF6] fill-[#8B5CF6] shrink-0" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-500 leading-tight truncate">Total Mazdoori</p>
            <p className="text-[19px] font-bold text-[#8B5CF6] leading-tight mt-0.5 truncate">
              Rs 10,200
            </p>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={cn(
            'px-5 py-2.5 text-sm font-semibold transition-all rounded-t-xl',
            activeTab === 'sales'
              ? 'text-[#1877F2] border-b-[3px] border-[#1877F2] bg-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100/70 hover:bg-slate-200/60'
          )}
        >
          Sales Report
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('customer')}
          className={cn(
            'px-5 py-2.5 text-sm font-semibold transition-all rounded-t-xl',
            activeTab === 'customer'
              ? 'text-[#1877F2] border-b-[3px] border-[#1877F2] bg-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100/70 hover:bg-slate-200/60'
          )}
        >
          Customer Report
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mazdoori')}
          className={cn(
            'px-5 py-2.5 text-sm font-semibold transition-all rounded-t-xl',
            activeTab === 'mazdoori'
              ? 'text-[#1877F2] border-b-[3px] border-[#1877F2] bg-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100/70 hover:bg-slate-200/60'
          )}
        >
          Mazdoori Report
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={cn(
            'px-5 py-2.5 text-sm font-semibold transition-all rounded-t-xl',
            activeTab === 'daily'
              ? 'text-[#1877F2] border-b-[3px] border-[#1877F2] bg-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100/70 hover:bg-slate-200/60'
          )}
        >
          Daily Report
        </button>
      </div>

      {/* Main Reports Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {activeTab === 'sales' && (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-4 text-center">Total Items</th>
                <th className="py-3 px-4 text-center">Total Amount</th>
                <th className="py-3 px-4 text-center">Received</th>
                <th className="py-3 px-4 text-center">Credit</th>
                <th className="py-3 px-4 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SALES_REPORT_DATA.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-5 text-slate-700 text-sm font-medium">{row.date}</td>
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
                    className={cn(
                      'py-3 px-4 text-center font-bold text-sm',
                      row.credit > 0 ? 'text-red-600' : 'text-emerald-600'
                    )}
                  >
                    {row.credit.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      className="text-slate-600 hover:text-[#1877F2] transition-colors p-1"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 stroke-[2]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'customer' && (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                <th className="py-3 px-5">Customer Name</th>
                <th className="py-3 px-4 text-center">Total Orders</th>
                <th className="py-3 px-4 text-center">Total Amount</th>
                <th className="py-3 px-4 text-center">Received</th>
                <th className="py-3 px-4 text-center">Credit</th>
                <th className="py-3 px-4 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {CUSTOMER_REPORT_DATA.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-5 text-slate-800 text-sm font-medium">{row.name}</td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {row.totalOrders}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {row.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {row.received.toLocaleString()}
                  </td>
                  <td
                    className={cn(
                      'py-3 px-4 text-center font-bold text-sm',
                      row.credit > 0 ? 'text-red-600' : 'text-emerald-600'
                    )}
                  >
                    {row.credit.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      className="text-slate-600 hover:text-[#1877F2] transition-colors p-1"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 stroke-[2]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'mazdoori' && (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                <th className="py-3 px-5">Worker Name</th>
                <th className="py-3 px-4 text-center">Task Type</th>
                <th className="py-3 px-4 text-center">Total Tasks</th>
                <th className="py-3 px-4 text-center">Total Amount</th>
                <th className="py-3 px-4 text-center">Received</th>
                <th className="py-3 px-4 text-center">Credit</th>
                <th className="py-3 px-4 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MAZDOORI_REPORT_DATA.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-5 text-slate-800 text-sm font-medium">{row.name}</td>
                  <td className="py-3 px-4 text-center text-slate-700 text-sm">{row.taskType}</td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {row.totalTasks}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {row.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {row.received.toLocaleString()}
                  </td>
                  <td
                    className={cn(
                      'py-3 px-4 text-center font-bold text-sm',
                      row.credit > 0 ? 'text-red-600' : 'text-emerald-600'
                    )}
                  >
                    {row.credit.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      className="text-slate-600 hover:text-[#1877F2] transition-colors p-1"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 stroke-[2]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'daily' && (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-4 text-center">Total Bills</th>
                <th className="py-3 px-4 text-center">Total Amount</th>
                <th className="py-3 px-4 text-center">Received</th>
                <th className="py-3 px-4 text-center">Credit</th>
                <th className="py-3 px-4 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DAILY_REPORT_DATA.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-5 text-slate-700 text-sm font-medium">{row.date}</td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {row.totalBills}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {row.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {row.received.toLocaleString()}
                  </td>
                  <td
                    className={cn(
                      'py-3 px-4 text-center font-bold text-sm',
                      row.credit > 0 ? 'text-red-600' : 'text-emerald-600'
                    )}
                  >
                    {row.credit.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      className="text-slate-600 hover:text-[#1877F2] transition-colors p-1"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 stroke-[2]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
