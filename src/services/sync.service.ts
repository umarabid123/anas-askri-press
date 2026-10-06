import { useUIStore } from '@/stores/ui.store'
import type { SyncResult, SyncQueueRecord } from '@/types/database'
import { exportDatabase, getSyncQueue, updateSyncStatus } from './sqlite.service'
import { getSupabaseClient, isSupabaseConfigured } from './supabase'
import { TABLES, type Backup, type TableName, type Row } from './data-model'

const aliases: Record<string, TableName> = { customer: 'customers', sale: 'sales', item: 'items', sale_item: 'sale_items', sale_item_mazdoori_task: 'sale_item_mazdoori_tasks', payment: 'payments', mazdoor: 'mazdoors', mazdoori_entry: 'mazdoori_entries', customer_ledger: 'customer_ledger', business_settings: 'business_settings', expense: 'expenses' }
export interface Change { table: TableName; operation: 'UPSERT' | 'DELETE'; row: Row }
export function buildChanges(backup: Backup, queue: SyncQueueRecord[]): Change[] {
  const changes = new Map<string, Change>()
  for (const record of queue) {
    const table = aliases[record.entityType] || record.entityType as TableName
    if (!TABLES.includes(table) || table === 'sync_queue') throw new Error('Unsupported sync entity: ' + record.entityType)
    const row = backup.tables[table].find(row => row.id === record.entityId)
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
      const row = backup.tables[table].find(row => row.id === id)
      if (!row) throw new Error('Missing sync parent: ' + table)
      const parent: Change = { table, operation: 'UPSERT', row }
      changes.set(table + ':' + id, parent); parents(parent)
    }
  }
  for (const change of Array.from(changes.values())) if (change.operation === 'UPSERT') parents(change)
  return Array.from(changes.values()).map(change => ({ ...change, row: Object.fromEntries(Object.entries(change.row).map(([key, value]) => [key, ['created_at', 'updated_at', 'payment_date', 'date'].includes(key) && typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(' ', 'T') + 'Z' : value])) })).sort((a, b) => {
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
  public start() {
    if (!this.interval) this.interval = setInterval(() => { void this.processQueue() }, 15000)
  }
  public async processQueue(manual = false): Promise<SyncResult> {
    const result: SyncResult = { totalProcessed: 0, successCount: 0, failedCount: 0, errors: [] }
    if (this.processing) return result
    if (manual) { localStorage.removeItem('arki_sync_paused'); this.retryAt = 0 }
    if (localStorage.getItem('arki_sync_paused') === 'true') { useUIStore.getState().setSyncStatus('pending'); return result }
    if (!isSupabaseConfigured()) { useUIStore.getState().setSyncStatus('pending'); return result }
    if (!navigator.onLine) { useUIStore.getState().setIsOnline(false); useUIStore.getState().setSyncStatus('pending'); return result }
    if (!manual && Date.now() < this.retryAt) return result
    const client = getSupabaseClient()
    if (!client) return result
    this.processing = true
    let queue: SyncQueueRecord[] = []
    try {
      const { data, error: authError } = await client.auth.getSession()
      if (authError) throw authError
      if (!data.session) { useUIStore.getState().setSyncStatus('pending'); return result }
      // One coherent local snapshot; rows created during network I/O remain queued.
      const snapshot = await exportDatabase()
      queue = snapshot.tables.sync_queue.filter(r => r.status !== 'synced').map(r => ({
        id: String(r.id), entityType: String(r.entity_type) as SyncQueueRecord['entityType'], entityId: String(r.entity_id),
        operation: String(r.operation) as SyncQueueRecord['operation'], payload: {}, status: 'pending', retryCount: Number(r.retry_count), lastError: null, createdAt: String(r.created_at), updatedAt: String(r.updated_at),
      }))
      if (!queue.length) { useUIStore.getState().setSyncStatus('synced'); return result }
      useUIStore.getState().setSyncStatus('syncing')
      result.totalProcessed = queue.length
      const changes = buildChanges(snapshot, queue)
      const { error } = await client.rpc('apply_pos_changes', { changes })
      if (error) throw new Error(error.message)
      for (const item of queue) await updateSyncStatus(item.id, 'synced')
      result.successCount = queue.length; this.lastError = null; this.retryAt = 0
      useUIStore.getState().setLastSyncTime(new Date().toISOString())
      useUIStore.getState().setSyncStatus((await getSyncQueue()).length ? 'pending' : 'synced')
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
  public getError() { return this.lastError }
  public async pause() {
    localStorage.setItem('arki_sync_paused', 'true')
    const deadline = Date.now() + 30000
    while (this.processing) {
      if (Date.now() > deadline) throw new Error('Cloud upload is still running. Please retry restore after it finishes.')
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  public calculateBackoffDelay(retryCount: number): number { return Math.min(2000 * 2 ** Math.min(retryCount, 5), 60000) }
  public cleanup() { if (this.interval) clearInterval(this.interval); this.interval = null }
}
export const syncService = new SyncService()
