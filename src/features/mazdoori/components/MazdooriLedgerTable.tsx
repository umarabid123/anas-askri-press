import type { Sale } from '@/types'
import { formatDate, formatPKR } from '@/utils/financial'
import { mazdooriDay, type mazdooriLedger } from '../period'

type LedgerRow = ReturnType<typeof mazdooriLedger>[number]
const weightLabel = (value: number) => value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function MazdooriLedgerTable({ rows, totals, onViewBill }: {
  rows: LedgerRow[]
  totals?: LedgerRow
  onViewBill?: (sale: Sale) => void
}) {
  return <table className="w-full min-w-[760px] text-left text-sm border-collapse">
    <caption className="p-3 text-left text-xs text-slate-500">
      Click a date, customer or row to open its bill. Totals exclude cancelled bills.
    </caption>
    <thead className="bg-slate-100 text-xs text-slate-700 border-y border-slate-200"><tr>
      <th className="p-3">Date</th>
      <th className="p-3">Customer Name</th>
      <th className="p-3 text-right">Mazdoori</th><th className="p-3 text-right text-teal-900" title="Running total for the selected records">Total Mazdoori</th>
      <th className="p-3 text-right">Weight</th><th className="p-3 text-right text-slate-900" title="Running total for the selected records">Total Weight</th>
    </tr></thead>
    <tbody className="divide-y divide-slate-100">
      {!rows.length && <tr><td colSpan={6} className="p-12 text-center text-slate-400">No mazdoori records found.</td></tr>}
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
          </button> : row.sale.customerName || 'Cash Sale'}
        </td>
        <td className="p-3 text-right whitespace-nowrap">{formatPKR(row.mazdoori)}</td>
        <td className="p-3 text-right font-semibold text-teal-900 whitespace-nowrap">{formatPKR(row.totalMazdoori)}</td>
        <td className="p-3 text-right tabular-nums">{weightLabel(row.weight)}</td>
        <td className="p-3 text-right font-semibold text-teal-900 tabular-nums">{weightLabel(row.totalWeight)}</td>
      </tr>)}
    </tbody>
    {totals && <tfoot className="bg-teal-50 font-bold border-t-2 border-teal-200"><tr>
      <td colSpan={3} className="p-3">Total · all selected records</td>
      <td className="p-3 text-right text-slate-900 whitespace-nowrap">{formatPKR(totals.totalMazdoori)}</td>
      <td /><td className="p-3 text-right text-slate-900 tabular-nums">{weightLabel(totals.totalWeight)}</td>
    </tr></tfoot>}
  </table>
}
