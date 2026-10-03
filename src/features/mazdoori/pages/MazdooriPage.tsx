import { HardHat, Pencil, Plus, Trash2 } from 'lucide-react'

interface MazdooriRow {
  id: string
  date: string
  mazdoorName: string
  kaamDetail: string
  amount: number
  payment: number
  balance: number
}

const INITIAL_MAZDOORI: MazdooriRow[] = [
  { id: '1', date: '12 Sep 2025', mazdoorName: 'Rashid', kaamDetail: 'CNC Cutting', amount: 2000, payment: 1000, balance: 1000 },
  { id: '2', date: '11 Sep 2025', mazdoorName: 'Imran', kaamDetail: 'Chadar Bending', amount: 1500, payment: 1500, balance: 0 },
  { id: '3', date: '10 Sep 2025', mazdoorName: 'Salman', kaamDetail: 'Laser Cutting', amount: 3000, payment: 0, balance: 3000 },
  { id: '4', date: '09 Sep 2025', mazdoorName: 'Asif', kaamDetail: 'Dabi Welding', amount: 2500, payment: 2500, balance: 0 },
  { id: '5', date: '08 Sep 2025', mazdoorName: 'Bilal', kaamDetail: 'Chogat Fitting', amount: 1200, payment: 1000, balance: 200 },
]

export function MazdooriPage() {
  const totalMazdoori = INITIAL_MAZDOORI.reduce((s, m) => s + m.amount, 0)
  const totalPaid = INITIAL_MAZDOORI.reduce((s, m) => s + m.payment, 0)
  const remainingBalance = INITIAL_MAZDOORI.reduce((s, m) => s + m.balance, 0)

  return (
    <div className="space-y-4 h-full flex flex-col justify-between">
      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex-1 flex flex-col">
        {/* Title & Action Row */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 leading-tight">Mazdoori</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Mazdooron ka hisaab alag rakho</p>
          </div>
          <button
            type="button"
            className="h-10 px-4 bg-[#1877F2] hover:bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Mazdoori</span>
          </button>
        </div>

        {/* Mazdoori Table */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden flex-1">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Mazdoor Name</th>
                <th className="py-2.5 px-4">Kaam / Detail</th>
                <th className="py-2.5 px-4 text-center">Amount (Rs)</th>
                <th className="py-2.5 px-4 text-center">Payment</th>
                <th className="py-2.5 px-4 text-center">Balance</th>
                <th className="py-2.5 px-4 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INITIAL_MAZDOORI.map((entry, index) => (
                <tr key={entry.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 text-center text-xs font-medium text-slate-600">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4 text-slate-700 text-sm font-medium">{entry.date}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 text-sm">{entry.mazdoorName}</td>
                  <td className="py-3 px-4 text-slate-600 text-sm">{entry.kaamDetail}</td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {entry.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-800 font-semibold text-sm">
                    {entry.payment.toLocaleString()}
                  </td>
                  <td
                    className={`py-3 px-4 text-center font-bold text-sm ${
                      entry.balance > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {entry.balance.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        className="text-slate-600 hover:text-blue-600 transition-colors"
                        title="Edit Entry"
                      >
                        <Pencil className="w-4 h-4 stroke-[2]" />
                      </button>
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Summary Bar with soft tint */}
      <div className="bg-[#EBF7EE] rounded-2xl border border-emerald-100 px-8 py-3.5 shadow-xs flex items-center justify-between shrink-0">
        {/* Total Mazdoori */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center">
            <HardHat className="w-5 h-5 stroke-[2] text-white" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Mazdoori</p>
            <p className="text-[20px] font-bold text-slate-900 leading-tight">
              Rs {totalMazdoori.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Total Paid */}
        <div className="text-center">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Paid</p>
          <p className="text-[20px] font-bold text-emerald-600 leading-tight">
            Rs {totalPaid.toLocaleString()}
          </p>
        </div>

        {/* Remaining (Balance) */}
        <div className="text-right">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Remaining (Balance)</p>
          <p className="text-[20px] font-bold text-red-600 leading-tight">
            Rs {remainingBalance.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
