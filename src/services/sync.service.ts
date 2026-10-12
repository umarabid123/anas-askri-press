import { useUIStore } from '@/stores/ui.store'
import type { SyncResult, SyncQueueRecord } from '@/types/database'
import { exportDatabase, getSyncQueue, updateSyncStatus, clearSyncQueue, mergeCloudRecords } from './sqlite.service'
import { syncCloudChanges, isSupabaseConfigured, pullCloudRecords } from './supabase'
import { TABLES, type Backup, type TableName, type Row } from './data-model'

const aliases: Record<string, TableName> = { customer: 'customers', sale: 'sales', item: 'items', sale_item: 'sale_items', sale_item_mazdoori_task: 'sale_item_mazdoori_tasks', payment: 'payments', mazdoor: 'mazdoors', mazdoori_entry: 'mazdoori_entries', customer_ledger: 'customer_ledger', business_settings: 'business_settings', expense: 'expenses' }
const KNOWN_COLUMNS: Partial<Record<TableName, Set<string>>> = {
  business_settings: new Set([
    'id', 'business_name', 'subtitle', 'phone', 'address', 'logo_path',
    'invoice_prefix', 'next_invoice_number', 'receipt_paper_size',
    'footer_text', 'show_logo', 'default_printer', 'currency', 'currency_symbol',
    'created_at', 'updated_at', 'sync_status',
  ]),
  customers: new Set([
    'id', 'name', 'mobile', 'address', 'total_purchase', 'total_paid',
    'balance', 'created_at', 'updated_at', 'sync_status',
  ]),
  items: new Set([
    'id', 'name', 'urdu_name', 'category', 'default_rate', 'is_active',
    'created_at', 'updated_at', 'sync_status',
  ]),
  sales: new Set([
    'id', 'invoice_number', 'customer_id', 'customer_name', 'customer_mobile',
    'subtotal', 'discount', 'total_mazdoori', 'total', 'paid_amount',
    'remaining_credit', 'payment_method', 'notes', 'created_at', 'updated_at',
    'sync_status', 'cancelled_at', 'cancel_reason',
  ]),
  sale_items: new Set([
    'id', 'sale_id', 'item_id', 'item_name', 'quantity', 'rate', 'mazdoori', 'amount', 'created_at',
  ]),
  sale_item_mazdoori_tasks: new Set([
    'id', 'sale_item_id', 'title', 'amount', 'worker_name', 'created_at',
  ]),
  payments: new Set([
    'id', 'receipt_number', 'customer_id', 'sale_id', 'amount', 'payment_method',
    'payment_date', 'notes', 'created_at', 'sync_status',
  ]),
  customer_ledger: new Set([
    'id', 'customer_id', 'sale_id', 'payment_id', 'date', 'description',
    'debit', 'credit', 'balance', 'created_at',
  ]),
  mazdoors: new Set([
    'id', 'name', 'phone', 'total_work', 'total_paid', 'balance',
    'created_at', 'updated_at', 'sync_status',
  ]),
  mazdoori_entries: new Set([
    'id', 'mazdoor_id', 'mazdoor_name', 'work_date', 'work_detail',
    'amount', 'paid_amount', 'balance', 'notes', 'created_at', 'sync_status',
  ]),
  expenses: new Set([
    'id', 'category', 'amount', 'expense_date', 'payment_method',
    'notes', 'created_at', 'updated_at', 'sync_status',
  ]),
}

export interface Change { table: TableName; operation: 'UPSERT' | 'DELETE'; row: Row }
export function buildChanges(backup: Backup, queue: SyncQueueRecord[]): Change[] {
  const changes = new Map<string, Change>()
  for (const record of queue) {
    const table = aliases[record.entityType] || record.entityType as TableName
    if (!TABLES.includes(table) || table === 'sync_queue') throw new Error('Unsupported sync entity: ' + record.entityType)
    const row = backup.tables[table]?.find(row => row.id === record.entityId)
    changes.set(table + ':' + record.entityId, row ? { table, operation: 'UPSERT', row } : { table, operation: 'DELETE', row: { id: record.entityId } })
  }
  // Include parents for retried/legacy records, ensuring foreign keys resolve in one atomic cloud transaction.
  const references: Partial<Record<TableName, Array<[string, TableName]>>> = {
    sales: [['customer_id', 'customers']], sale_items: [['sale_id', 'sales']],
    sale_item_mazdoori_tasks: [['sale_item_id', 'sale_items']], payments: [['sale_id', 'sales'], ['customer_id', 'customers']],
    customer_ledger: [['customer_id', 'customers'], ['sale_id', 'sales']], mazdoori_entries: [['mazdoor_id', 'mazdoors']],
  }
  function parents(change: Change) {
    for (const [field, table] of references[change.table] || []) {
      const id = change.row[field]
      if (!id || changes.has(table + ':' + id)) continue
      const row = backup.tables[table]?.find(row => row.id === id)
      if (!row) {
        if (change.table === 'sales' && field === 'customer_id') {
          change.row[field] = null
          continue
        }
        continue
      }
      const parent: Change = { table, operation: 'UPSERT', row }
      changes.set(table + ':' + id, parent); parents(parent)
    }
  }
  // Include child lines and tasks for any upserted sales so invoice total balance checks pass
  for (const change of Array.from(changes.values())) {
    if (change.table === 'sales' && change.operation === 'UPSERT' && !change.row.cancelled_at) {
      const saleId = change.row.id
      const saleItems = backup.tables.sale_items?.filter(i => i.sale_id === saleId) || []
      for (const item of saleItems) {
        if (!changes.has('sale_items:' + item.id)) {
          changes.set('sale_items:' + item.id, { table: 'sale_items', operation: 'UPSERT', row: item })
        }
        const tasks = backup.tables.sale_item_mazdoori_tasks?.filter(t => t.sale_item_id === item.id) || []
        for (const task of tasks) {
          if (!changes.has('sale_item_mazdoori_tasks:' + task.id)) {
            changes.set('sale_item_mazdoori_tasks:' + task.id, { table: 'sale_item_mazdoori_tasks', operation: 'UPSERT', row: task })
          }
        }
      }
    }
  }
  for (const change of Array.from(changes.values())) if (change.operation === 'UPSERT') parents(change)
  return Array.from(changes.values()).map(change => {
    const allowed = KNOWN_COLUMNS[change.table]
    return {
      ...change,
      row: Object.fromEntries(
        Object.entries(change.row)
          .filter(([key, value]) => {
            if (allowed && !allowed.has(key)) return false
            if (key === 'urdu_name' && (value === null || value === undefined || value === '')) return false
            if (key === 'unit' || key === 'email' || key === 'owner_name' || key === 'ownerName' || key === 'qr_code_path' || key === 'qrCodePath') return false
            return true
          })
          .map(([key, value]) => [
            key,
            ['created_at', 'updated_at', 'payment_date', 'date'].includes(key) && typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
              ? value.replace(' ', 'T') + 'Z'
              : value,
          ])
      ),
    }
  }).sort((a, b) => {
    if (a.operation !== b.operation) return a.operation === 'UPSERT' ? -1 : 1
    const order = TABLES.indexOf(a.table) - TABLES.indexOf(b.table)
    return a.operation === 'DELETE' ? -order : order
  })
}

class SyncService {
  private processing = false
  private interval: ReturnType<typeof setInterval> | null = null
  private retryAt = 0
  private lastError: string | null = null
  private scheduled: ReturnType<typeof setTimeout> | null = null
  private unsubscribeStore: (() => void) | null = null
  private onlineHandler = () => {
    useUIStore.getState().setIsOnline(true)
    this.retryAt = 0
    this.schedule(0)
  }
  private offlineHandler = () => {
    useUIStore.getState().setIsOnline(false)
    useUIStore.getState().setSyncStatus('pending')
  }
  private schedule(delay = 250) {
    if (!this.interval) return
    if (this.scheduled) clearTimeout(this.scheduled)
    this.scheduled = setTimeout(() => {
      this.scheduled = null
      void this.processQueue().catch(error => {
        this.lastError = error instanceof Error ? error.message : String(error)
        useUIStore.getState().setSyncStatus('failed')
      })
    }, delay)
  }
  public start() {
    if (this.interval) return
    // Periodic retries also cover native SQLite writes and Wi-Fi that stays
    // connected while the cloud endpoint temporarily cannot be reached.
    this.interval = setInterval(() => this.schedule(0), 15000)
    window.addEventListener('online', this.onlineHandler)
    window.addEventListener('offline', this.offlineHandler)
    this.unsubscribeStore = useUIStore.subscribe((state, previous) => {
      if (state.isOnline && !previous.isOnline) {
        this.retryAt = 0
        this.schedule(0)
      } else if (state.syncStatus === 'pending' && previous.syncStatus !== 'pending') {
        this.schedule()
      }
    })
    this.schedule(0)
  }
  public async processQueue(manual = false): Promise<SyncResult> {
    const result: SyncResult = { totalProcessed: 0, successCount: 0, failedCount: 0, errors: [] }
    if (this.processing) return result
    if (manual) { localStorage.removeItem('arki_sync_paused'); this.retryAt = 0 }
    if (localStorage.getItem('arki_sync_paused') === 'true') { useUIStore.getState().setSyncStatus('pending'); return result }
    if (!isSupabaseConfigured()) { useUIStore.getState().setSyncStatus('pending'); return result }
    if (!navigator.onLine) { useUIStore.getState().setIsOnline(false); useUIStore.getState().setSyncStatus('pending'); return result }
    if (!manual && Date.now() < this.retryAt) return result
    this.processing = true
    let queue: SyncQueueRecord[] = []
    try {
      // One coherent local snapshot; rows created during network I/O remain queued.
      const snapshot = await exportDatabase()
      queue = snapshot.tables.sync_queue.filter(r => r.status !== 'synced').map(r => ({
        id: String(r.id), entityType: String(r.entity_type) as SyncQueueRecord['entityType'], entityId: String(r.entity_id),
        operation: String(r.operation) as SyncQueueRecord['operation'], payload: {}, status: 'pending', retryCount: Number(r.retry_count), lastError: null, createdAt: String(r.created_at), updatedAt: String(r.updated_at),
      }))
      if (!queue.length) {
        useUIStore.getState().setSyncStatus('synced')
        await this.pullRemoteChanges()
        return result
      }
      useUIStore.getState().setSyncStatus('syncing')
      result.totalProcessed = queue.length
      const changes = buildChanges(snapshot, queue)
      await syncCloudChanges(changes)
      for (const item of queue) await updateSyncStatus(item.id, 'synced')
      result.successCount = queue.length; this.lastError = null; this.retryAt = 0
      useUIStore.getState().setLastSyncTime(new Date().toISOString())
      const hasMore = (await getSyncQueue()).length > 0
      useUIStore.getState().setSyncStatus(hasMore ? 'pending' : 'synced')
      if (hasMore) this.schedule()
      await this.pullRemoteChanges()
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err)
      result.failedCount = queue.length || 1
      result.errors.push({ id: queue[0]?.id || 'sync', error: this.lastError })
      for (const item of queue) await updateSyncStatus(item.id, 'failed', this.lastError)
      this.retryAt = Date.now() + this.calculateBackoffDelay(queue.reduce((max, item) => Math.max(max, item.retryCount), 0))
      useUIStore.getState().setSyncStatus('failed')
    } finally { this.processing = false }
    return result
  }
  private pulling = false
  public async pullRemoteChanges(): Promise<number> {
    if (this.pulling) return 0
    if (localStorage.getItem('arki_sync_paused') === 'true') return 0
    if (!isSupabaseConfigured()) return 0
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0

    this.pulling = true
    try {
      const since = localStorage.getItem('arki_last_pulled_at')
      const remoteData = await pullCloudRecords(since)
      if (remoteData && typeof remoteData === 'object' && 'tables' in remoteData) {
        const { mergedCount } = await mergeCloudRecords(remoteData)
        const now = new Date().toISOString()
        localStorage.setItem('arki_last_pulled_at', now)
        useUIStore.getState().setLastSyncTime(now)
        if (mergedCount > 0 && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          try {
            const evt = typeof CustomEvent !== 'undefined' ? new CustomEvent('arki_data_synced', { detail: { mergedCount } }) : { type: 'arki_data_synced' }
            window.dispatchEvent(evt as Event)
          } catch {
            // ignore event dispatch errors
          }
        }
        return mergedCount
      }
    } catch (err) {
      console.warn('Pull sync note:', err instanceof Error ? err.message : err)
    } finally {
      this.pulling = false
    }
    return 0
  }
  public getError() { return this.lastError }
  public async clearStuckQueue(): Promise<number> {
    const count = await clearSyncQueue(false)
    this.lastError = null
    this.retryAt = 0
    useUIStore.getState().setSyncStatus('synced')
    return count
  }
  public async pause() {
    localStorage.setItem('arki_sync_paused', 'true')
    const deadline = Date.now() + 30000
    while (this.processing) {
      if (Date.now() > deadline) throw new Error('Cloud upload is still running. Please retry restore after it finishes.')
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  public calculateBackoffDelay(retryCount: number): number { return Math.min(2000 * 2 ** Math.min(retryCount, 5), 60000) }
  public cleanup() {
    if (this.interval) clearInterval(this.interval)
    if (this.scheduled) clearTimeout(this.scheduled)
    this.interval = null; this.scheduled = null
    window.removeEventListener('online', this.onlineHandler)
    window.removeEventListener('offline', this.offlineHandler)
    this.unsubscribeStore?.(); this.unsubscribeStore = null
  }
}
export const syncService = new SyncService()
