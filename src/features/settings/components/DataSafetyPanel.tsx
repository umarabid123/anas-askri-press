import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { validateBackup, type Backup } from '@/services/data-model'
import { isTauri, restoreDatabase } from '@/services/sqlite.service'
import { automaticBackup, exportBackup, saveFile } from '@/services/files.service'
import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase'
import { syncService } from '@/services/sync.service'

export function DataSafetyPanel() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<Backup | null>(null)
  const [daily, setDaily] = useState(localStorage.getItem('arki_daily_backup') === 'true')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [account, setAccount] = useState<string | null>(null)
  const client = getSupabaseClient()
  useEffect(() => {
    if (!client) return
    void client.auth.getSession().then(({ data }) => setAccount(data.session?.user.email || null))
    const { data } = client.auth.onAuthStateChange((_, session) => setAccount(session?.user.email || null))
    return () => data.subscription.unsubscribe()
  }, [client])
  async function action(work: () => Promise<void>) {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { await work() } catch (err) { setError(err instanceof Error ? err.message : String(err)) } finally { setBusy(false) }
  }
  const stage = (input: unknown) => { setPending(validateBackup(input)) }
  const pick = () => action(async () => {
    if (isTauri()) { const backup = await invoke('pick_backup_file'); if (backup) stage(backup) }
    else fileRef.current?.click()
  })
  const upload = () => action(async () => {
    const result = await syncService.processQueue(true)
    if (result.errors.length) throw new Error(result.errors.map(e => e.error).join('; '))
    setMessage(result.successCount ? 'Local changes uploaded to cloud.' : 'No changes uploaded. Check that your approved cloud account is signed in.')
  })
  return <Card className="p-5 space-y-4">
    <h2 className="font-semibold">Backups & Cloud Records</h2>
    {message && <p role="status" className="p-3 bg-emerald-50 text-emerald-800">{message}</p>}
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
      <h3 className="font-semibold">Optional Cloud Sync</h3>
      {!isSupabaseConfigured() ? <p className="text-sm">Cloud is not configured. Offline billing and downloaded backups work normally.</p> : <>
        <p className="text-xs text-slate-600">Use an existing approved shop account after the secure database migration has been applied. Signing in does not automatically replace local records.</p>
        {account ? <><p className="text-sm">Signed in: {account}</p><div className="flex gap-2 flex-wrap">
          <Button type="button" disabled={busy} onClick={upload}>Upload / Resume Sync</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => action(async () => {
            await syncService.pause()
            const { data, error } = await client!.rpc('export_pos_data')
            if (error) throw new Error(error.message)
            stage(data)
          })}>Restore Cloud Records</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => action(async () => {
            const { data, error } = await client!.rpc('export_pos_data')
            if (error) throw new Error(error.message)
            const backup = validateBackup(data)
            if (await saveFile('ARKI-CLOUD-BACKUP.json', new Blob([JSON.stringify(backup)], { type: 'application/json' }))) setMessage('Cloud backup exported.')
          })}>Export Cloud Backup</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => action(async () => { const { error } = await client!.auth.signOut(); if (error) throw error; setMessage('Cloud account signed out. Local records remain available.') })}>Sign Out</Button>
        </div></> : <div className="space-y-3">
          <Input label="Cloud account email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Cloud account password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
          <Button type="button" disabled={busy || !email || !password} onClick={() => action(async () => {
            const { error } = await client!.auth.signInWithPassword({ email: email.trim(), password })
            if (error) throw error
            setPassword(''); setMessage('Signed in. Upload local changes or review cloud records below.')
          })}>Sign In</Button>
        </div>}
      </>}
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
    <p className="text-xs text-slate-500">Only version 2 Arki backups can be restored. Older incomplete JSON exports cannot safely reconstruct missing invoice items or payment history.</p>
  </Card>
}
