import { printDocument } from '@/utils/printing'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  DollarSign,
  Edit,
  HardHat,
  Plus,
  Printer,
  Trash2,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatPKR, formatDate } from '@/utils/financial'
import {
  getMazdoors,
  updateMazdoor,
  getMazdooriEntries,
  createMazdooriEntry,
  deleteMazdooriEntry,
  payMazdoor,
} from '@/services/sqlite.service'
import { EditWorkerModal } from '../components/EditWorkerModal'
import { PayWorkerModal } from '../components/PayWorkerModal'
import { AddMazdooriEntryModal } from '../components/AddMazdooriEntryModal'
import type { Mazdoor, MazdooriEntry } from '@/types'

export function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [worker, setWorker] = useState<Mazdoor | null>(null)
  const [entries, setEntries] = useState<MazdooriEntry[]>([])
  const [actionError, setActionError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState<MazdooriEntry | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const allWorkers = await getMazdoors()
      const current = allWorkers.find((w) => w.id === id) || null
      setWorker(current)

      if (current) {
        const workerEntries = await getMazdooriEntries(current.id)
        setEntries(workerEntries)
      }
    } catch (err) {
      console.error('Failed to load worker details:', err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleUpdateWorker = async (updated: Mazdoor) => {
    const res = await updateMazdoor(updated)
    setWorker(res)
    return res
  }

  const handlePayout = async (payment: { mazdoorId: string; amount: number; notes?: string }) => {
    await payMazdoor(payment)
    await loadData()
    return true
  }

  const handleAddEntry = async (entry: {
    mazdoorId: string
    mazdoorName: string
    workDate: string
    workDetail: string
    amount: number
    paidAmount: number
    notes?: string
  }) => {
    const res = await createMazdooriEntry(entry)
    await loadData()
    return res
  }

  const handleDeleteEntryConfirm = async () => {
    if (!deletingEntry) return
    try {
      await deleteMazdooriEntry(deletingEntry.id)
      setDeletingEntry(null)
      await loadData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err)); setDeletingEntry(null)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!worker) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-12">
        <h2 className="text-lg font-bold text-slate-900">Worker Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          The craftsman record you requested could not be located.
        </p>
        <Button onClick={() => navigate('/mazdoori')} className="flex items-center gap-2 mx-auto">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Mazdoori</span>
        </Button>
      </div>
    )
  }

  return (
    <div id="worker-statement-print" className="space-y-5 flex flex-col h-full">
      {actionError && <p role="alert" className="p-3 text-red-700 bg-red-50">{actionError}</p>}
      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/mazdoori')}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              title="Back to Mazdoori"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{worker.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                  Craftsman / Worker
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Phone: <span className="font-semibold text-slate-700">{worker.phone || 'Not recorded'}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsPayOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs"
            >
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
              <span>Record Payout</span>
            </Button>
            <Button
              onClick={() => setIsAddEntryOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Work Entry</span>
            </Button>
            <Button
              onClick={() => printDocument('worker-statement-print')}
              variant="outline"
              className="flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 stroke-[2]" />
              <span>Print Ledger</span>
            </Button>
            <Button
              onClick={() => setIsEditOpen(true)}
              variant="outline"
              className="flex items-center gap-1.5"
            >
              <Edit className="w-4 h-4 stroke-[2]" />
              <span>Edit Profile</span>
            </Button>
          </div>
        </div>

        {/* 3 Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <HardHat className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Work Done</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {formatPKR(worker.totalWork)}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Paid Out</p>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">
                {formatPKR(worker.totalPaid)}
              </p>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border flex items-center gap-3.5 ${
              worker.balance > 0
                ? 'bg-purple-50/70 border-purple-200/90 text-purple-900'
                : 'bg-emerald-50/70 border-emerald-200/90 text-emerald-900'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                worker.balance > 0 ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">Outstanding Balance Owed</p>
              <p className="text-lg font-black mt-0.5">
                {formatPKR(worker.balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Entries Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HardHat className="w-5 h-5 text-purple-600 stroke-[2.2]" />
            <h2 className="text-base font-bold text-slate-900">Labor Ledger & Transaction History</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {entries.length} Total Records
          </span>
        </div>

        <div className="border border-slate-200/90 rounded-xl overflow-hidden flex-1">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Work Detail / Description</th>
                <th className="py-2.5 px-4 text-right">Work Amount (+)</th>
                <th className="py-2.5 px-4 text-right">Payout Paid (-)</th>
                <th className="py-2.5 px-4 text-right">Balance Owed</th>
                <th className="py-2.5 px-4 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-sm">No labor entries recorded yet</p>
                    <p className="text-xs mt-1">Labor tasks saved from bills or manually will appear here.</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-center text-xs font-medium text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                      {formatDate(entry.workDate)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 text-sm">
                      {entry.workDetail}
                      {entry.notes && (
                        <p className="text-[11px] text-slate-400 font-normal mt-0.5">{entry.notes}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-purple-700 text-sm">
                      {entry.amount > 0 ? `Rs ${entry.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600 text-sm">
                      {entry.paidAmount > 0 ? `Rs ${entry.paidAmount.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      Rs {entry.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setDeletingEntry(entry)}
                        className="p-1 hover:text-red-600 hover:bg-red-50 rounded-lg text-slate-400 transition-colors"
                        title="Void Entry"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2]" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <EditWorkerModal
        isOpen={isEditOpen}
        worker={worker}
        onClose={() => setIsEditOpen(false)}
        onUpdate={handleUpdateWorker}
      />

      <PayWorkerModal
        isOpen={isPayOpen}
        worker={worker}
        onClose={() => setIsPayOpen(false)}
        onSubmit={handlePayout}
      />

      <AddMazdooriEntryModal
        isOpen={isAddEntryOpen}
        workers={[worker]}
        preselectedWorkerId={worker.id}
        onClose={() => setIsAddEntryOpen(false)}
        onSubmit={handleAddEntry}
      />

      <ConfirmDialog
        isOpen={!!deletingEntry}
        onClose={() => setDeletingEntry(null)}
        onConfirm={handleDeleteEntryConfirm}
        title="Void Labor Entry"
        description="Add a reversal for this entry? The original entry stays in history and the worker balance will be corrected. Invoice-linked labor cannot be voided here."
        confirmText="Delete Entry"
        variant="danger"
      />
    </div>
  )
}
