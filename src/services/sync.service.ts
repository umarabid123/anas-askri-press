import { useUIStore } from '@/stores/ui.store'
import type { SyncQueueRecord, SyncResult } from '@/types/database'
import { connectivityService } from './connectivity.service'
import { getSyncQueue, updateSyncStatus } from './sqlite.service'
import { getSupabaseClient, isSupabaseConfigured } from './supabase'

const MAX_RETRY_ATTEMPTS = 5
const BASE_RETRY_DELAY_MS = 2000

class SyncService {
  private isProcessing = false
  private autoSyncInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.initAutoSync()
  }

  private initAutoSync() {
    // When connectivity is restored, trigger immediate queue flush
    connectivityService.subscribe((isOnline) => {
      if (isOnline && isSupabaseConfigured()) {
        this.processQueue().catch((err) => {
          console.error('Automatic background sync failed:', err)
        })
      }
    })

    // Periodic queue check every 60 seconds
    this.autoSyncInterval = setInterval(() => {
      if (connectivityService.getStatus() && isSupabaseConfigured() && !this.isProcessing) {
        this.processQueue().catch(console.error)
      }
    }, 60000)
  }

  /**
   * Processes all pending and failed records in the sync queue
   */
  public async processQueue(): Promise<SyncResult> {
    if (this.isProcessing) {
      return { totalProcessed: 0, successCount: 0, failedCount: 0, errors: [] }
    }

    if (!connectivityService.getStatus()) {
      useUIStore.getState().setSyncStatus('pending')
      return { totalProcessed: 0, successCount: 0, failedCount: 0, errors: [] }
    }

    if (!isSupabaseConfigured()) {
      useUIStore.getState().setSyncStatus('synced')
      return { totalProcessed: 0, successCount: 0, failedCount: 0, errors: [] }
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      useUIStore.getState().setSyncStatus('failed')
      return { totalProcessed: 0, successCount: 0, failedCount: 0, errors: [] }
    }

    this.isProcessing = true
    useUIStore.getState().setSyncStatus('syncing')

    const result: SyncResult = {
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      errors: [],
    }

    try {
      const queue = await getSyncQueue(50)

      if (queue.length === 0) {
        useUIStore.getState().setSyncStatus('synced')
        this.isProcessing = false
        return result
      }

      for (const item of queue) {
        result.totalProcessed += 1

        // Check retry count limit
        if (item.retryCount >= MAX_RETRY_ATTEMPTS) {
          result.failedCount += 1
          result.errors.push({
            id: item.id,
            error: `Max retries (${MAX_RETRY_ATTEMPTS}) exceeded: ${item.lastError || 'Unknown error'}`,
          })
          continue
        }

        try {
          await this.syncItem(item, supabase)
          await updateSyncStatus(item.id, 'synced')
          result.successCount += 1
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          result.failedCount += 1
          result.errors.push({ id: item.id, error: errorMsg })
          await updateSyncStatus(item.id, 'failed', errorMsg)
        }
      }

      // Update global UI sync state
      if (result.failedCount > 0) {
        useUIStore.getState().setSyncStatus('failed')
      } else {
        useUIStore.getState().setSyncStatus('synced')
      }
    } catch (err) {
      console.error('Fatal sync error:', err)
      useUIStore.getState().setSyncStatus('failed')
    } finally {
      this.isProcessing = false
    }

    return result
  }

  /**
   * Idempotent sync operation for individual entity types
   */
  private async syncItem(
    item: SyncQueueRecord,
    supabase: NonNullable<ReturnType<typeof getSupabaseClient>>
  ): Promise<void> {
    const payload = item.payload

    switch (item.entityType) {
      case 'customer': {
        // Last-write-wins upsert for customer profile
        const { error } = await supabase.from('customers').upsert(
          {
            id: item.entityId,
            name: payload.name,
            mobile: payload.mobile,
            address: payload.address || null,
            total_purchase: payload.totalPurchase ?? 0,
            total_paid: payload.totalPaid ?? 0,
            balance: payload.balance ?? 0,
            updated_at: new Date().toISOString(),
            sync_status: 'synced',
          },
          { onConflict: 'id' }
        )
        if (error) throw new Error(`Customer sync failed: ${error.message}`)
        break
      }

      case 'sale': {
        // Immutable Append for financial records (Sale, Items, Payment, Ledger)
        // 1. Check or upsert sale
        const { error: saleError } = await supabase.from('sales').upsert(
          {
            id: item.entityId,
            invoice_number: payload.invoiceNumber,
            customer_id: payload.customerId || null,
            customer_name: payload.customerName || null,
            customer_mobile: payload.customerMobile || null,
            subtotal: payload.subtotal,
            discount: payload.discount ?? 0,
            total_mazdoori: payload.totalMazdoori ?? 0,
            total: payload.total,
            paid_amount: payload.paidAmount ?? 0,
            remaining_credit: payload.remainingCredit ?? 0,
            payment_method: payload.paymentMethod || 'cash',
            notes: payload.notes || null,
            sync_status: 'synced',
          },
          { onConflict: 'id' }
        )
        if (saleError) throw new Error(`Sale header sync failed: ${saleError.message}`)

        // 2. Upsert Sale Items
        const items = (payload.items as Array<Record<string, unknown>>) || []
        for (const it of items) {
          const itemId = (it.id as string) || `si-${Date.now()}`
          const { error: itemError } = await supabase.from('sale_items').upsert(
            {
              id: itemId,
              sale_id: item.entityId,
              item_id: it.itemId || null,
              item_name: it.itemName,
              quantity: it.quantity,
              rate: it.rate,
              mazdoori: it.mazdoori ?? 0,
              amount: it.amount,
            },
            { onConflict: 'id' }
          )
          if (itemError) throw new Error(`Sale item sync failed: ${itemError.message}`)

          // 3. Upsert Mazdoori Tasks for item if present
          const tasks = (it.mazdooriTasks as Array<Record<string, unknown>>) || []
          for (const task of tasks) {
            const taskId = (task.id as string) || `task-${Date.now()}`
            const { error: taskError } = await supabase.from('sale_item_mazdoori_tasks').upsert(
              {
                id: taskId,
                sale_item_id: itemId,
                title: task.title,
                amount: task.amount ?? 0,
                worker_name: task.workerName || null,
              },
              { onConflict: 'id' }
            )
            if (taskError) throw new Error(`Labor task sync failed: ${taskError.message}`)
          }
        }
        break
      }

      default:
        console.warn(`Unsupported sync entity type: ${item.entityType}`)
        break
    }
  }

  /**
   * Calculates exponential backoff delay with jitter
   */
  public calculateBackoffDelay(retryCount: number): number {
    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, Math.min(retryCount, 5))
    const jitter = Math.random() * 1000
    return Math.min(delay + jitter, 60000)
  }

  public cleanup() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval)
      this.autoSyncInterval = null
    }
  }
}

export const syncService = new SyncService()
