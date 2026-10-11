import { useEffect, useState } from 'react'
import { AppRouter } from './app/router'
import { connectivityService } from './services/connectivity.service'
import { initDatabase } from './services/sqlite.service'
import { syncService } from './services/sync.service'
import { automaticBackup } from './services/files.service'
import { Toaster } from './components/common/Toaster'
import { checkAppUpdate, type UpdateCheckResult } from './services/updater.service'
import { UpdateModal } from './components/ui/UpdateModal'

export default function App() {
  const [warning, setWarning] = useState('')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoUpdateInfo, setAutoUpdateInfo] = useState<UpdateCheckResult | null>(null)

  useEffect(() => {
    let cancelled = false
    initDatabase().then(async () => {
      if (cancelled) return
      setReady(true)
      await automaticBackup().catch(err => setWarning('Daily backup failed: ' + String(err)))
      if (cancelled) return
      syncService.start()
      connectivityService.start()
      void connectivityService.verifyConnection()
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : String(err))
    })

    return () => {
      cancelled = true
      connectivityService.cleanup()
      syncService.cleanup()
    }
  }, [])

  // Auto-check for desktop app updates after startup
  useEffect(() => {
    if (!ready) return
    if (localStorage.getItem('arki_auto_check_updates') === 'false') return

    const timer = setTimeout(() => {
      checkAppUpdate()
        .then((res) => {
          if (res.available) {
            setAutoUpdateInfo(res)
          }
        })
        .catch(() => {
          // Silent catch for background check
        })
    }, 3500)

    return () => clearTimeout(timer)
  }, [ready])

  if (error) return <div role="alert" className="p-8">Local data could not be opened: {error}. Please keep your existing data and restart the application.</div>
  if (!ready) return <div className="p-8">Opening local records…</div>
  return (
    <>
      {warning && <p role="alert" className="p-2 text-red-700">{warning}</p>}
      <AppRouter />
      <Toaster />
      {autoUpdateInfo && (
        <UpdateModal
          updateInfo={autoUpdateInfo}
          onClose={() => setAutoUpdateInfo(null)}
        />
      )}
    </>
  )
}
