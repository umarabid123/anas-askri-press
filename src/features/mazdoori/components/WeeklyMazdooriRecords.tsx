import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { formatDate, formatPKR, roundMoney } from '@/utils/financial'
import type { Sale } from '@/types'
import { mazdooriLedger, mazdooriWeeks } from '../period'
import { MazdooriLedgerTable } from './MazdooriLedgerTable'

const dateLabel = (date: string) => formatDate(date + 'T12:00:00')
const buttonClass = 'rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

export function WeeklyMazdooriRecords({ sales, isLoading, error, onViewBill }: { sales: Sale[]; isLoading: boolean; error: string | null; onViewBill: (sale: Sale) => void }) {
  const weeks = useMemo(() => mazdooriWeeks(sales), [sales])
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const selected = weeks.find(week => week.from === selectedStart)
  const selectedLedger = useMemo(() => mazdooriLedger(selected?.sales ?? []), [selected])
  const pages = Math.max(1, Math.ceil(weeks.length / 10))
  const current = Math.min(page, pages)
  const total = roundMoney(weeks.reduce((sum, week) => sum + week.total, 0))

  return <>
    <section className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Weekly Mazdoori Records</h2>
        <p className="mt-1 text-xs text-slate-500">Saturday–Thursday · Friday off</p>
      </div>
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4" role="status">
        <p className="text-sm font-semibold text-teal-800">Total mazdoori · all weeks</p>
        <p className="text-2xl font-bold text-teal-900">{formatPKR(total)}</p>
        <p className="text-xs text-slate-600 mt-1">{weeks.length} {weeks.length === 1 ? 'week' : 'weeks'} on record · Cancelled bills excluded</p>
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[660px] text-sm text-left">
          <thead className="bg-slate-100 text-xs text-slate-700 border-b border-slate-200"><tr>
            <th className="p-3">Week (Saturday - Thursday)</th><th className="p-3">Days with Mazdoori</th><th className="p-3">Active Bills</th><th className="p-3 text-right">Total Mazdoori</th><th className="p-3">Details</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading weekly records...</td></tr>
              : !weeks.length ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">No weekly records found.</td></tr>
                : weeks.slice((current - 1) * 10, current * 10).map(week => <tr key={week.from} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedStart(week.from)}>
                  <td className="p-3 font-semibold text-slate-900">{dateLabel(week.from)} to {dateLabel(week.to)}</td>
                  <td className="p-3">{week.days} of 6 days</td><td className="p-3">{week.bills}</td>
                  <td className="p-3 text-right font-semibold text-teal-900">{formatPKR(week.total)}</td>
                  <td className="p-3"><button type="button" className={buttonClass} aria-label={'View week starting ' + dateLabel(week.from)} onClick={event => { event.stopPropagation(); setSelectedStart(week.from) }}>View records</button></td>
                </tr>)}
          </tbody>
          <tfoot className="bg-teal-50 font-bold border-t-2 border-teal-200"><tr><td colSpan={3} className="p-3">Total for {weeks.length} weeks</td><td className="p-3 text-right text-teal-900">{formatPKR(total)}</td><td /></tr></tfoot>
        </table>
      </div>
      {pages > 1 && <div className="flex items-center justify-end gap-3 text-xs">
        <button type="button" className={buttonClass} disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous</button>
        <span>Page {current} of {pages}</span>
        <button type="button" className={buttonClass} disabled={current >= pages} onClick={() => setPage(current + 1)}>Next</button>
      </div>}
      <p className="text-xs text-slate-500">Friday entries are available in Mazdoori records → All time.</p>
    </section>
    <Modal isOpen={!!selected} onClose={() => setSelectedStart(null)} title="Weekly Mazdoori Details" description={selected ? dateLabel(selected.from) + ' (Saturday) to ' + dateLabel(selected.to) + ' (Thursday)' : ''} size="full" footer={<button type="button" className={buttonClass} onClick={() => setSelectedStart(null)}>Close</button>}>
      {selected && <div className="space-y-4">
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-teal-900">
          <p className="text-sm font-semibold">Week total</p><p className="text-2xl font-semibold">{formatPKR(selected.total)}</p>
          <p className="text-xs mt-1">{selected.days} days with mazdoori · {selected.bills} active bills · Friday holiday</p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <MazdooriLedgerTable rows={selectedLedger} totals={selectedLedger.at(-1)} onViewBill={sale => { setSelectedStart(null); onViewBill(sale) }} />
        </div>
      </div>}
    </Modal>
  </>
}
