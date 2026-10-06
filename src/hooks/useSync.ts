import { useState } from 'react'
import { getSyncQueue } from '@/services/sqlite.service'
import { syncService } from '@/services/sync.service'
import { useUIStore } from '@/stores/ui.store'
import type { SyncQueueRecord, SyncResult } from '@/types/database'

export function useSync() {
  const syncStatus = useUIStore((state) => state.syncStatus)
  const isOnline = useUIStore((state) => state.isOnline)
  const [isProcessing, setIsProcessing] = useState(false)

  const triggerSync = async (): Promise<SyncResult> => {
    setIsProcessing(true)
    try {
      return await syncService.processQueue(true)
    } finally {
      setIsProcessing(false)
    }
  }

  const fetchPendingQueue = async (limit = 50): Promise<SyncQueueRecord[]> => {
    return getSyncQueue(limit)
  }

  return {
    syncStatus,
    isOnline,
    isProcessing,
    triggerSync,
    fetchPendingQueue,
  }
}
