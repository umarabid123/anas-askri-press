import { useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { validateBackup, type Backup } from '@/services/data-model'
import { isTauri, restoreDatabase } from '@/services/sqlite.service'
import { automaticBackup, exportBackup, saveFile } from '@/services/files.service'
import { exportCloudRecords, isSupabaseConfigured } from '@/services/supabase'
import { syncService } from '@/services/sync.service'
import { toast } from '@/stores/toast.store'
import { checkAppUpdate, type UpdateCheckResult, APP_VERSION } from '@/services/updater.service'
import { UpdateModal } from '@/components/ui/UpdateModal'
import { RefreshCw, Sparkles } from 'lucide-react'

export function DataSafetyPanel() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const setMessage = (message: string) => { if (message) toast.info(message) }
  const [error, setError] = useState('')
  const [pending, setPending] = useState<Backup | null>(null)
  const [daily, setDaily] = useState(localStorage.getItem('arki_daily_backup') === 'true')
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(localStorage.getItem('arki_auto_check_updates') !== 'false')
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  async function action(work: () => Promise<void>) {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { await work() } catch (err) { const message = err instanceof Error ? err.message : String(err); setError(message); toast.error(message) } finally { setBusy(false) }
  }
  const stage = (input: unknown) => { setPending(validateBackup(input)) }
  const pick = () => action(async () => {
    if (isTauri()) { const backup = await invoke('pick_backup_file'); if (backup) stage(backup) }
    else fileRef.current?.click()
  })
  const upload = () => action(async () => {
    const result = await syncService.processQueue(true)
    if (result.errors.length) throw new Error(result.errors.map(e => e.error).join('; '))
    setMessage(result.successCount ? 'Local changes uploaded to cloud.' : 'No pending changes to upload.')
  })
  return <Card className="p-5 space-y-4">
    <h2 className="font-semibold">Backups & Cloud Records</h2>
    {error && <p role="alert" className="p-3 bg-red-50 text-red-700">{error}</p>}
    <p className="text-sm text-slate-600">Backup files contain all invoices, item details, receipts, customer and worker ledgers, and settings. JSON files are not encrypted; keep them somewhere private.</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={busy} onClick={() => action(async () => { if (await exportBackup()) setMessage('Full backup exported.') })}>Export Backup File</Button>
      <Button type="button" variant="outline" disabled={busy} onClick={pick}>Restore Backup File</Button>
      {!isTauri() && <Button type="button" variant="outline" disabled={busy} onClick={() => action(async () => {
        const raw = localStorage.getItem('arki_pre_restore_v2') || localStorage.getItem('arki_daily_recovery')
        if (!raw) throw new Error('No recovery copy is available yet.')
        if (await saveFile('ARKI-RECOVERY.json', new Blob([raw], { type: 'application/json' }))) setMessage('Recovery copy exported.')
      })}>Export Recovery Copy</Button>}
    </div>
    <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" aria-label="Choose backup file" onChange={e => {
      const file = e.target.files?.[0]; e.target.value = ''
      if (file) void action(async () => { if (file.size > 50_000_000) throw new Error('Backup must be smaller than 50 MB.'); stage(JSON.parse(await file.text())) })
    }} />
    <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={daily} disabled={busy} onChange={e => {
      const checked = e.target.checked; setDaily(checked); localStorage.setItem('arki_daily_backup', String(checked))
      if (checked) void action(async () => { await automaticBackup(); setMessage('Daily recovery copy enabled. Export a separate backup for protection against device loss.') })
    }} />Create a daily recovery copy when the app opens</label>
    <p className="text-xs text-slate-500">{isTauri() ? 'Daily and pre-restore copies are stored in the application data backups folder.' : 'Browser recovery copies remain in this browser. Clearing site data removes them; download backups regularly.'}</p>
    <div className="border-t pt-4 space-y-3">
      <h3 className="font-semibold">Automatic Cloud Sync</h3>
      {!isSupabaseConfigured() ? <p className="text-sm">Cloud is not configured. Offline billing and downloaded backups work normally.</p> : <>
        <p className="text-sm text-slate-600">Records save on this device first. Changes upload automatically while online; no email or password is needed. If the internet stops, keep working; pending changes upload when it returns.</p>
        <div className="flex gap-2 flex-wrap">
          <Button type="button" disabled={busy} onClick={upload}>Upload / Resume Sync</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => action(async () => {
            await syncService.pause()
            const data = await exportCloudRecords()
            stage(data)
          })}>Restore Cloud Records</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => action(async () => {
            const data = await exportCloudRecords()
            const backup = validateBackup(data)
            if (await saveFile('ARKI-CLOUD-BACKUP.json', new Blob([JSON.stringify(backup)], { type: 'application/json' }))) setMessage('Cloud backup exported.')
          })}>Export Cloud Backup</Button>
          <Button type="button" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" disabled={busy} onClick={() => action(async () => {
            const count = await syncService.clearStuckQueue()
            setMessage(count > 0 ? `Cleared ${count} stuck sync entries. Cloud sync is reset.` : 'Sync queue is already clean.')
          })}>Clear Stuck Sync Queue</Button>
        </div>
      </>}
    </div>

    {/* Zero-Data-Loss Software Updates Section */}
    <div className="border-t pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <span>Application Updates</span>
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-normal">
            v{APP_VERSION}
          </span>
        </h3>
      </div>
      <p className="text-sm text-slate-600">
        Updating to new releases replaces application code while keeping your SQLite database, invoices, and settings completely intact. An automatic safety snapshot is created before updating.
      </p>
      
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={checkingUpdate || busy}
          onClick={async () => {
            setCheckingUpdate(true)
            try {
              const res = await checkAppUpdate()
              setUpdateInfo(res)
              if (res.available) {
                setShowUpdateModal(true)
                toast.success(`Update ${res.newVersion} is ready to install!`)
              } else if (res.error) {
                toast.error(res.error)
              } else {
                toast.info('Your desktop application is already up to date.')
              }
            } finally {
              setCheckingUpdate(false)
            }
          }}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
          {checkingUpdate ? 'Checking for Updates…' : 'Check for Updates'}
        </Button>

        {updateInfo?.available && (
          <Button
            type="button"
            onClick={() => setShowUpdateModal(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Sparkles className="w-4 h-4" />
            Install Update {updateInfo.newVersion}
          </Button>
        )}
      </div>

      <label className="flex gap-2 items-center text-sm text-slate-700 pt-1">
        <input
          type="checkbox"
          checked={autoCheckUpdates}
          onChange={(e) => {
            const checked = e.target.checked
            setAutoCheckUpdates(checked)
            localStorage.setItem('arki_auto_check_updates', String(checked))
          }}
        />
        Check for updates automatically when the application opens
      </label>
    </div>

    <ConfirmDialog isOpen={!!pending} onClose={() => { if (!busy) setPending(null) }} title="Replace local records?"
      description={pending ? `Restore ${pending.tables.sales.length} invoices, ${pending.tables.customers.length} customers, ${pending.tables.mazdoors.length} workers and ${pending.tables.payments.length} receipts? Current records will be replaced after a recovery copy is saved. Cloud uploads will stay paused until you choose Upload / Resume Sync.` : ''}
      isLoading={busy}
      confirmText={busy ? 'Restoring…' : 'Restore Records'} variant="danger"
      onConfirm={() => action(async () => {
        if (!pending) return
        await syncService.pause()
        await restoreDatabase(pending)
        setPending(null); setMessage('Records restored. Reloading the app…')
        window.location.reload()
      })} />

    {showUpdateModal && updateInfo && (
      <UpdateModal
        updateInfo={updateInfo}
        onClose={() => setShowUpdateModal(false)}
      />
    )}

    <p className="text-xs text-slate-500">Only version 2 Arki backups can be restored. Older incomplete JSON exports cannot safely reconstruct missing invoice items or payment history.</p>
  </Card>
}
