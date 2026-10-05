import { useEffect } from 'react'
import { AppRouter } from './app/router'
import { connectivityService } from './services/connectivity.service'
import { initDatabase } from './services/sqlite.service'
import { syncService } from './services/sync.service'

export default function App() {
  useEffect(() => {
    // 1. Initialize SQLite database & migrations
    initDatabase().catch((err) => {
      console.error('Failed to initialize local SQLite database:', err)
    })

    // 2. Perform initial connectivity check & auto-sync if available
    connectivityService.verifyConnection().then((isOnline) => {
      if (isOnline) {
        syncService.processQueue().catch((err) => {
          console.error('Initial background sync error:', err)
        })
      }
    })

    return () => {
      connectivityService.cleanup()
      syncService.cleanup()
    }
  }, [])

  return <AppRouter />
}
