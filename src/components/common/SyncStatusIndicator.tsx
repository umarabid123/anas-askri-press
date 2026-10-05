import { Loader2 } from 'lucide-react'
import { syncService } from '@/services/sync.service'
import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/utils/cn'

export function SyncStatusIndicator({ className }: { className?: string }) {
  const { syncStatus, isOnline } = useUIStore()

  // Determine current badge presentation
  if (!isOnline || syncStatus === 'pending') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs select-none',
          className
        )}
        title="Internet unavailable. All bills, payments and entries are safely stored in local SQLite."
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span>Offline — Saved locally</span>
      </div>
    )
  }

  if (syncStatus === 'syncing') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs select-none',
          className
        )}
        title="Syncing local changes to cloud database..."
      >
        <Loader2 className="w-2.5 h-2.5 text-blue-600 animate-spin" />
        <span>Syncing...</span>
      </div>
    )
  }

  if (syncStatus === 'failed') {
    return (
      <button
        type="button"
        onClick={() => syncService.processQueue()}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors shadow-2xs select-none cursor-pointer',
          className
        )}
        title="Sync failed. Click to retry synchronization."
      >
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span>Sync failed — Retry</span>
      </button>
    )
  }

  // Default: synced
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs select-none',
        className
      )}
      title="All data is synchronized and backed up."
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      <span>Synced</span>
    </div>
  )
}
