import { invoke } from '@tauri-apps/api/core'
import { exportDatabase, isTauri } from './sqlite.service'
export async function saveFile(name: string, blob: Blob): Promise<boolean> {
  if (isTauri()) {
    const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()))
    return invoke<boolean>('save_export_file', { name, bytes, kind: blob.type === 'application/json' ? 'json' : 'png' })
  }
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
export async function exportBackup() {
  const backup = await exportDatabase()
  return saveFile('ARKI-BACKUP-' + new Date().toISOString().slice(0, 10) + '.json', new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
}
export async function automaticBackup() {
  if (localStorage.getItem('arki_daily_backup') !== 'true') return
  if (isTauri()) { await invoke('daily_backup'); return }
  const date = new Date().toLocaleDateString('en-CA')
  if (localStorage.getItem('arki_daily_backup_date') === date) return
  localStorage.setItem('arki_daily_recovery', JSON.stringify(await exportDatabase()))
  localStorage.setItem('arki_daily_backup_date', date)
}
export async function openWhatsApp(url: string) {
  if (isTauri()) await invoke('open_whatsapp', { url })
  else window.open(url, '_blank', 'noopener,noreferrer')
}
