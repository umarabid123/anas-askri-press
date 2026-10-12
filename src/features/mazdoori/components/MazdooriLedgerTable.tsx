import { Pencil, Trash2 } from 'lucide-react'
import type { Sale } from '@/types'
import { formatDate, formatPKR } from '@/utils/financial'
import { mazdooriDay, type mazdooriLedger } from '../period'

type LedgerRow = ReturnType<typeof mazdooriLedger>[number]
const weightLabel = (value: number) => value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function MazdooriLedgerTable({ rows, totals, onViewBill, onEditMazdoori, onDeleteMazdoori }: {
  rows: LedgerRow[]
  totals?: LedgerRow
  onViewBill?: (sale: Sale) => void
  onEditMazdoori?: (sale: Sale) => void
  onDeleteMazdoori?: (sale: Sale) => void
}) {
  const hasActions = Boolean(onEditMazdoori || onDeleteMazdoori)

  return <table className="w-full min-w-[760px] text-left text-sm border-collapse">
    <caption className="p-3 text-left text-xs text-slate-500">
      Click a date, customer or row to open its bill. Totals exclude cancelled bills.
    </caption>
    <thead className="bg-slate-100 text-xs text-slate-700 border-y border-slate-200"><tr>
      <th className="p-3">Date</th>
      <th className="p-3">Customer Name</th>
      <th className="p-3 text-right">Mazdoori</th><th className="p-3 text-right text-teal-900" title="Running total for the selected records">Total Mazdoori</th>
      <th className="p-3 text-right">Weight</th><th className="p-3 text-right text-slate-900" title="Running total for the selected records">Total Weight</th>
      {hasActions && <th className="p-3 text-center min-w-[140px]">Actions</th>}
    </tr></thead>
    <tbody className="divide-y divide-slate-100">
      {!rows.length && <tr><td colSpan={hasActions ? 7 : 6} className="p-12 text-center text-slate-400">No mazdoori records found.</td></tr>}
      {rows.map(row => <tr key={row.sale.id}
        onClick={onViewBill ? () => onViewBill(row.sale) : undefined}
        className={(row.sale.cancelledAt ? 'text-slate-400 bg-slate-50' : 'text-slate-700 hover:bg-slate-50') + (onViewBill ? ' cursor-pointer' : '')}>
        <td className="p-3 whitespace-nowrap">
          {onViewBill ? <button type="button" onClick={event => { event.stopPropagation(); onViewBill(row.sale) }}
            className="font-medium text-blue-800 underline decoration-blue-200 underline-offset-4 hover:decoration-blue-700 cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-slate-500"
            aria-label={'View bill ' + row.sale.invoiceNumber + ' dated ' + formatDate(row.sale.createdAt)}>
            {mazdooriDay(row.sale.createdAt).slice(0, 3)}, {formatDate(row.sale.createdAt)}
          </button> : <span>{mazdooriDay(row.sale.createdAt).slice(0, 3)}, {formatDate(row.sale.createdAt)}</span>}
          {row.sale.cancelledAt && <span className="block text-xs text-red-600">Cancelled - excluded</span>}
        </td>
        <td className="p-3">
          {onViewBill ? <button type="button" onClick={event => { event.stopPropagation(); onViewBill(row.sale) }}
            className="text-left font-medium text-blue-800 underline decoration-blue-200 underline-offset-4 hover:decoration-blue-700 cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-slate-500"
            aria-label={'View bill ' + row.sale.invoiceNumber + ' for ' + (row.sale.customerName || 'Cash Sale')}>
            {row.sale.customerName || 'Cash Sale'}
          </button> : <span>{row.sale.customerName || 'Cash Sale'}</span>}
          {row.sale.items?.[0]?.itemName && (
            <span className="block text-[11px] text-slate-500 truncate max-w-[220px]" title={row.sale.items.map(i => i.itemName).join(', ')}>
              {row.sale.items.map(i => i.itemName).join(', ')}
            </span>
          )}
        </td>
        <td className={`p-3 text-right whitespace-nowrap font-medium ${row.mazdoori < 0 ? 'text-red-600 font-semibold' : 'text-slate-800'}`}>
          {formatPKR(row.mazdoori)}
        </td>
        <td className="p-3 text-right font-semibold text-teal-900 whitespace-nowrap">{formatPKR(row.totalMazdoori)}</td>
        <td className="p-3 text-right tabular-nums">{weightLabel(row.weight)}</td>
        <td className="p-3 text-right font-semibold text-teal-900 tabular-nums">{weightLabel(row.totalWeight)}</td>
        {hasActions && (
          <td className="p-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-1.5">
              {onEditMazdoori && (
                <button
                  type="button"
                  onClick={() => onEditMazdoori(row.sale)}
                  className="h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-2xs"
                  title={`Edit mazdoori #${row.sale.invoiceNumber}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
              {onDeleteMazdoori && (
                <button
                  type="button"
                  onClick={() => onDeleteMazdoori(row.sale)}
                  className="h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 shadow-2xs"
                  title={`Delete mazdoori #${row.sale.invoiceNumber}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </td>
        )}
      </tr>)}
    </tbody>
    {totals && <tfoot className="bg-teal-50 font-bold border-t-2 border-teal-200"><tr>
      <td colSpan={3} className="p-3">Total · all selected records</td>
      <td className="p-3 text-right text-slate-900 whitespace-nowrap">{formatPKR(totals.totalMazdoori)}</td>
      <td /><td className="p-3 text-right text-slate-900 tabular-nums">{weightLabel(totals.totalWeight)}</td>
      {hasActions && <td />}
    </tr></tfoot>}
  </table>
}
