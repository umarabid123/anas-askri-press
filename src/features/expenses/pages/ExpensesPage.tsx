import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Banknote, Landmark, Plus, Receipt, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatCard } from '@/components/ui/StatCard'
import { getExpenses, deleteExpense } from '@/services/sqlite.service'
import { formatPKR, formatDate, localDateKey, roundMoney } from '@/utils/financial'
import { cn } from '@/utils/cn'
import { AddExpenseModal } from '../components/AddExpenseModal'
import type { Expense } from '@/types'

type Period = 'today' | 'month' | 'all'
const PERIODS: Array<[Period, string]> = [['today', 'Today'], ['month', 'This Month'], ['all', 'All Time']]

const sum = (rows: Expense[]) => roundMoney(rows.reduce((total, e) => total + e.amount, 0))
const byNewest = (a: Expense, b: Expense) => b.expenseDate.localeCompare(a.expenseDate) || b.createdAt.localeCompare(a.createdAt)

export function ExpensesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [category, setCategory] = useState('')
  // The dashboard's "Add Expense" button opens the form straight away
  const [isAddOpen, setIsAddOpen] = useState(() => !!(location.state as { addExpense?: boolean } | null)?.addExpense)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    getExpenses()
      .then(setExpenses)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setIsLoading(false))
  }, [])

  const today = localDateKey()
  const inPeriod = expenses.filter((e) => period === 'all' || (period === 'today' ? e.expenseDate === today : e.expenseDate.slice(0, 7) === today.slice(0, 7)))
  const shown = category ? inPeriod.filter((e) => e.category === category) : inPeriod
  const categoryTotals = Object.entries(
    inPeriod.reduce<Record<string, number>>((totals, e) => ({ ...totals, [e.category]: roundMoney((totals[e.category] || 0) + e.amount) }), {})
  ).sort((a, b) => b[1] - a[1])

  const closeAdd = () => {
    setIsAddOpen(false)
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }

  const handleDelete = async () => {
    if (!deleting) return
    setIsDeleting(true)
    try {
      await deleteExpense(deleting.id)
      setExpenses((prev) => prev.filter((e) => e.id !== deleting.id))
      setDeleting(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 leading-tight">Expenses</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Shop spending: bijli, kiraya, chadar purchase and other costs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            {PERIODS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  period === value ? 'bg-[#1877F2] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Expense</span>
          </Button>
        </div>
      </div>

      {error && <div role="alert" className="p-3 bg-red-50 text-red-700 rounded-xl">{error}</div>}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Expenses" value={formatPKR(sum(inPeriod))} subtitle={`${inPeriod.length} entries`} variant="red" icon={<Receipt className="w-5 h-5" />} />
        <StatCard title="Paid in Cash" value={formatPKR(sum(inPeriod.filter((e) => e.paymentMethod === 'cash')))} variant="slate" icon={<Banknote className="w-5 h-5" />} />
        <StatCard title="Paid from Bank" value={formatPKR(sum(inPeriod.filter((e) => e.paymentMethod === 'bank')))} variant="blue" icon={<Landmark className="w-5 h-5" />} />
      </div>

      {/* Category breakdown, doubles as a filter */}
      {categoryTotals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory('')}
            className={cn('px-3 py-1.5 rounded-full border text-xs font-semibold', !category ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')}
          >
            All
          </button>
          {categoryTotals.map(([name, total]) => (
            <button
              key={name}
              onClick={() => setCategory(category === name ? '' : name)}
              className={cn('px-3 py-1.5 rounded-full border text-xs font-semibold', category === name ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')}
            >
              {name} · {formatPKR(total)}
            </button>
          ))}
        </div>
      )}

      {/* Expense Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="border border-slate-200/90 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Details</th>
                  <th className="py-2.5 px-4">Paid By</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-center w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <p className="font-semibold text-sm">No expenses for this period</p>
                      <p className="text-xs mt-1">Use "Add Expense" to record shop spending.</p>
                    </td>
                  </tr>
                ) : (
                  shown.map((expense, index) => (
                    <tr key={expense.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center text-xs text-slate-500">{index + 1}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">{formatDate(expense.expenseDate + 'T00:00:00')}</td>
                      <td className="py-2.5 px-4 text-xs font-semibold text-slate-900">{expense.category}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">{expense.description || '-'}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 uppercase">{expense.paymentMethod}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-red-600 text-xs">{formatPKR(expense.amount)}</td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setDeleting(expense)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddExpenseModal
        isOpen={isAddOpen}
        onClose={closeAdd}
        onAdded={(expense) => setExpenses((prev) => [expense, ...prev].sort(byNewest))}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        variant="danger"
        title="Delete this expense?"
        description={deleting ? `${deleting.category} · ${formatPKR(deleting.amount)} on ${formatDate(deleting.expenseDate + 'T00:00:00')}` : ''}
        confirmText="Delete"
      />
    </div>
  )
}
