import { isSupabaseConfigured } from '@/services/supabase'
import { Loader2 } from 'lucide-react'
import { syncService } from '@/services/sync.service'
import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/utils/cn'

export function SyncStatusIndicator({ className }: { className?: string }) {
  const { syncStatus, isOnline } = useUIStore()
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
    message = 'Your records are safe on this device. Online saving will retry automatically. Click to try now.'
  } else if (syncStatus === 'pending') {
    detail = 'Waiting to save'
    message = 'Your records are saved on this device and will be saved online automatically.'
  }

  const needsAttention = !isOnline || !configured || paused || syncStatus === 'pending'
  const badgeClass = cn(
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-2xs select-none',
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

  return retry
    ? <button type="button" onClick={() => void syncService.processQueue(true)} className={badgeClass} title={message}>{content}</button>
    : <div role="status" className={badgeClass} title={message}>{content}</div>
}
