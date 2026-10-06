import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign,
  Eye,
  HardHat,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatPKR, formatDate } from '@/utils/financial'
import {
  getMazdoors,
  createMazdoor,
  updateMazdoor,
  deleteMazdoor,
  getMazdooriEntries,
  createMazdooriEntry,
  deleteMazdooriEntry,
  payMazdoor,
} from '@/services/sqlite.service'
import { AddWorkerModal } from '../components/AddWorkerModal'
import { EditWorkerModal } from '../components/EditWorkerModal'
import { PayWorkerModal } from '../components/PayWorkerModal'
import { AddMazdooriEntryModal } from '../components/AddMazdooriEntryModal'
import type { Mazdoor, MazdooriEntry } from '@/types'

export function MazdooriPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'workers' | 'entries'>('workers')

  const [workers, setWorkers] = useState<Mazdoor[]>([])
  const [entries, setEntries] = useState<MazdooriEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modals state
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Mazdoor | null>(null)
  const [payoutWorker, setPayoutWorker] = useState<Mazdoor | null>(null)
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false)
  const [deletingWorker, setDeletingWorker] = useState<Mazdoor | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<MazdooriEntry | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [w, e] = await Promise.all([getMazdoors(), getMazdooriEntries()])
      setWorkers(w)
      setEntries(e)
    } catch (err) {
      console.error('Failed to load Mazdoori data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalWorkers = workers.length
  const totalWork = workers.reduce((s, w) => s + (w.totalWork || 0), 0)
  const totalPaid = workers.reduce((s, w) => s + (w.totalPaid || 0), 0)
  const totalOwed = workers.reduce((s, w) => s + (w.balance || 0), 0)

  // Filtered workers
  const filteredWorkers = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.phone && w.phone.includes(searchTerm))
  )

  // Filtered entries
  const filteredEntries = entries.filter(
    (e) =>
      e.mazdoorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.workDetail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.workDate.includes(searchTerm)
  )

  const handleCreateWorker = async (data: { name: string; phone?: string }) => {
    const res = await createMazdoor(data)
    await loadData()
    return res
  }

  const handleUpdateWorker = async (worker: Mazdoor) => {
    const res = await updateMazdoor(worker)
    await loadData()
    return res
  }

  const handleDeleteWorkerConfirm = async () => {
    if (!deletingWorker) return
    setActionError(null)
    try {
      await deleteMazdoor(deletingWorker.id)
      setDeletingWorker(null)
      await loadData()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not delete worker.')
    }
  }

  const handlePayout = async (payment: { mazdoorId: string; amount: number; notes?: string }) => {
    await payMazdoor(payment)
    await loadData()
    return true
  }

  const handleCreateEntry = async (entry: {
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
      console.error('Failed to delete labor entry:', err)
    }
  }

  return (
    <div className="space-y-4 h-full flex flex-col justify-between">
      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex-1 flex flex-col">
        {/* Title & Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 leading-tight">Mazdoori (Labor Ledger)</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Auto-tracked partner breakdowns from bills, labor history, and craftsman payouts
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAddWorkerOpen(true)}
              variant="outline"
              className="flex items-center gap-1.5"
            >
              <Users className="w-4 h-4 stroke-[2]" />
              <span>Add Worker</span>
            </Button>
            <Button
              onClick={() => setIsAddEntryOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Labor Entry</span>
            </Button>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {actionError}
          </div>
        )}

        {/* Tabs & Search Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('workers')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'workers'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Workers & Partners ({workers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('entries')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'entries'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Labor Entries ({entries.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'workers'
                  ? 'Search worker by name or phone...'
                  : 'Search by worker, task, or date...'
              }
              className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Content Table Container */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="animate-spin w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full" />
            </div>
          ) : activeTab === 'workers' ? (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Worker / Partner Name</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4 text-right">Total Work Done</th>
                    <th className="py-2.5 px-4 text-right">Total Paid Out</th>
                    <th className="py-2.5 px-4 text-right">Balance Owed</th>
                    <th className="py-2.5 px-4 text-center w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <p className="font-semibold text-sm">No workers found</p>
                        <p className="text-xs mt-1">Workers are added automatically when bills with labor are saved or can be added manually.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredWorkers.map((worker, index) => (
                      <tr key={worker.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center text-xs font-medium text-slate-500">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => navigate(`/mazdoori/${worker.id}`)}
                            className="font-bold text-slate-900 text-sm hover:text-purple-600 text-left transition-colors"
                          >
                            {worker.name}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-sm font-medium">
                          {worker.phone || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900 text-sm">
                          {formatPKR(worker.totalWork)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600 text-sm">
                          {formatPKR(worker.totalPaid)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold text-sm ${
                            worker.balance > 0 ? 'text-purple-700' : 'text-slate-700'
                          }`}
                        >
                          {formatPKR(worker.balance)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-slate-600">
                            <button
                              type="button"
                              onClick={() => setPayoutWorker(worker)}
                              className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Record Payout"
                            >
                              <DollarSign className="w-4 h-4 stroke-[2.2]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/mazdoori/${worker.id}`)}
                              className="p-1.5 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="View Ledger"
                            >
                              <Eye className="w-4 h-4 stroke-[2]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingWorker(worker)}
                              className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Worker"
                            >
                              <Pencil className="w-4 h-4 stroke-[2]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionError(null)
                                setDeletingWorker(worker)
                              }}
                              className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Worker"
                            >
                              <Trash2 className="w-4 h-4 stroke-[2]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Worker</th>
                    <th className="py-2.5 px-4">Work Detail</th>
                    <th className="py-2.5 px-4 text-right">Labor (+)</th>
                    <th className="py-2.5 px-4 text-right">Paid Out (-)</th>
                    <th className="py-2.5 px-4 text-right">Balance</th>
                    <th className="py-2.5 px-4 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <p className="font-semibold text-sm">No entries match your search</p>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry, index) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center text-xs font-medium text-slate-500">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                          {formatDate(entry.workDate)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                          {entry.mazdoorName}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 text-sm">
                          {entry.workDetail}
                          {entry.notes && (
                            <span className="text-[11px] text-slate-400 ml-1.5">({entry.notes})</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-purple-700 text-sm">
                          {entry.amount > 0 ? formatPKR(entry.amount) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600 text-sm">
                          {entry.paidAmount > 0 ? formatPKR(entry.paidAmount) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                          {formatPKR(entry.balance)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setDeletingEntry(entry)}
                            className="p-1 hover:text-red-600 hover:bg-red-50 rounded-lg text-slate-400 transition-colors"
                            title="Delete Entry"
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
          )}
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 px-8 py-3.5 shadow-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-purple-900 text-white flex items-center justify-center">
            <HardHat className="w-5 h-5 fill-white stroke-none" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Workers</p>
            <p className="text-[20px] font-bold text-slate-900 leading-tight">{totalWorkers}</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Work Done</p>
          <p className="text-[20px] font-bold text-slate-900 leading-tight">
            {formatPKR(totalWork)}
          </p>
        </div>

        <div className="text-center">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Paid Out</p>
          <p className="text-[20px] font-bold text-emerald-600 leading-tight">
            {formatPKR(totalPaid)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[12px] font-medium text-slate-600 leading-tight">Total Liability (Owed)</p>
          <p className="text-[20px] font-bold text-purple-700 leading-tight">
            {formatPKR(totalOwed)}
          </p>
        </div>
      </div>

      {/* Modals */}
      <AddWorkerModal
        isOpen={isAddWorkerOpen}
        onClose={() => setIsAddWorkerOpen(false)}
        onAdd={handleCreateWorker}
      />

      <EditWorkerModal
        isOpen={!!editingWorker}
        worker={editingWorker}
        onClose={() => setEditingWorker(null)}
        onUpdate={handleUpdateWorker}
      />

      <PayWorkerModal
        isOpen={!!payoutWorker}
        worker={payoutWorker}
        onClose={() => setPayoutWorker(null)}
        onSubmit={handlePayout}
      />

      <AddMazdooriEntryModal
        isOpen={isAddEntryOpen}
        workers={workers}
        onClose={() => setIsAddEntryOpen(false)}
        onSubmit={handleCreateEntry}
      />

      <ConfirmDialog
        isOpen={!!deletingWorker}
        onClose={() => setDeletingWorker(null)}
        onConfirm={handleDeleteWorkerConfirm}
        title="Delete Worker"
        description={
          actionError
            ? actionError
            : `Are you sure you want to delete worker "${deletingWorker?.name}"? Deletion is blocked if previous labor history exists.`
        }
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!deletingEntry}
        onClose={() => setDeletingEntry(null)}
        onConfirm={handleDeleteEntryConfirm}
        title="Delete Labor Entry"
        description="Are you sure you want to void/delete this entry? The worker's balance will be adjusted accordingly."
        confirmText="Delete Entry"
        variant="danger"
      />
    </div>
  )
}
