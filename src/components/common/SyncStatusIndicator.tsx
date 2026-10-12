import { useState } from 'react'
import { isSupabaseConfigured } from '@/services/supabase'
import { Loader2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import { syncService } from '@/services/sync.service'
import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/utils/cn'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toast.store'

export function SyncStatusIndicator({ className }: { className?: string }) {
  const { syncStatus, isOnline } = useUIStore()
  const [showModal, setShowModal] = useState(false)
  const [busy, setBusy] = useState(false)
  const paused = localStorage.getItem('arki_sync_paused') === 'true'
  const configured = isSupabaseConfigured()
  const saving = isOnline && configured && !paused && syncStatus === 'syncing'
  const retry = isOnline && configured && !paused && syncStatus === 'failed'
  const connection = isOnline ? 'Online' : 'Offline'
  let message = 'Your records are saved. New changes are saved online automatically.'
  let detail = ''

  if (!isOnline) {
    message = 'Your records are saved on this device. They will be saved online automatically when the connection returns.'
  } else if (!configured) {
    detail = 'Setup needed'
    message = 'Your records are saved on this device. Set up online saving in Settings.'
  } else if (paused) {
    detail = 'Saving paused'
    message = 'Your records are saved on this device. Resume online saving in Settings.'
  } else if (saving) {
    detail = 'Saving...'
    message = 'Your records are being saved online. You can keep working.'
  } else if (retry) {
    detail = 'Try again'
    message = 'Your records are safe on this device. Online saving encountered an issue. Click to view details.'
  } else if (syncStatus === 'pending') {
    detail = 'Waiting to save'
    message = 'Your records are saved on this device and will be saved online automatically.'
  }

  const needsAttention = !isOnline || !configured || paused || syncStatus === 'pending'
  const badgeClass = cn(
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-2xs select-none transition-colors',
    retry ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer'
      : saving ? 'bg-blue-50 text-blue-700 border-blue-200/80'
        : needsAttention ? 'bg-amber-50 text-amber-700 border-amber-200/80'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    className,
  )
  const content = <>
    {saving ? <Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden="true" />
      : <span className={cn('w-2 h-2 rounded-full', retry ? 'bg-red-500' : needsAttention ? 'bg-amber-500' : 'bg-emerald-500')} aria-hidden="true" />}
    <span>{connection}{detail ? ' - ' + detail : ''}</span>
  </>

  const lastErr = syncService.getError()

  const handleRetry = async () => {
    setBusy(true)
    try {
      const res = await syncService.processQueue(true)
      if (res.errors.length) {
        toast.error('Sync failed: ' + res.errors[0].error)
      } else {
        toast.success('Sync completed successfully!')
        setShowModal(false)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  const handleClear = async () => {
    setBusy(true)
    try {
      const count = await syncService.clearStuckQueue()
      toast.success(count > 0 ? `Cleared ${count} stuck sync items. Sync is reset.` : 'Sync queue cleared.')
      setShowModal(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to clear queue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {retry ? (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={badgeClass}
          title={message}
        >
          {content}
        </button>
      ) : (
        <div role="status" className={badgeClass} title={message}>
          {content}
        </div>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Cloud Sync Issue</span>
            </div>
          }
          footer={
            <div className="flex justify-between w-full items-center">
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={handleClear}
                disabled={busy}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Clear Stuck Queue
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowModal(false)} disabled={busy}>
                  Close
                </Button>
                <Button onClick={handleRetry} disabled={busy}>
                  <RefreshCw className={cn('w-4 h-4 mr-1.5', busy && 'animate-spin')} />
                  Try Again
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-3 py-1">
            <p className="text-sm text-slate-700">
              Your bills and records are <strong className="text-emerald-700 font-semibold">100% safe</strong> on this computer.
              However, saving changes to the online cloud server encountered an issue.
            </p>

            {lastErr && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-mono text-red-800 break-all">
                {lastErr}
              </div>
            )}

            <p className="text-xs text-slate-500">
              If an old or conflicting entry is blocking sync, you can click <strong>Clear Stuck Queue</strong> to reset the sync queue and continue working normally.
            </p>
          </div>
        </Modal>
      )}
    </>
  )
}

