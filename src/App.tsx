import { useEffect, useState } from 'react'
import { AppRouter } from './app/router'
import { connectivityService } from './services/connectivity.service'
import { initDatabase } from './services/sqlite.service'
import { syncService } from './services/sync.service'
import { automaticBackup } from './services/files.service'
import { Toaster } from './components/common/Toaster'

export default function App() {
  const [warning, setWarning] = useState('')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    initDatabase().then(async () => {
      if (cancelled) return
      setReady(true)
      await automaticBackup().catch(err => setWarning('Daily backup failed: ' + String(err)))
      syncService.start()
      connectivityService.start()
      if (await connectivityService.verifyConnection()) await syncService.processQueue()
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : String(err))
    })

    return () => {
      cancelled = true
      connectivityService.cleanup()
      syncService.cleanup()
    }
  }, [])

  if (error) return <div role="alert" className="p-8">Local data could not be opened: {error}. Please keep your existing data and restart the application.</div>
  if (!ready) return <div className="p-8">Opening local records…</div>
  return <>{warning && <p role="alert" className="p-2 text-red-700">{warning}</p>}<AppRouter /><Toaster /></>
}
