import { useEffect, useState } from 'react'
import { connectivityService } from '@/services/connectivity.service'
import { useUIStore } from '@/stores/ui.store'

export function useConnectivity() {
  const isOnline = useUIStore((state) => state.isOnline)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const unsubscribe = connectivityService.subscribe((online) => {
      useUIStore.getState().setIsOnline(online)
    })
    return () => unsubscribe()
  }, [])

  const checkConnection = async () => {
    setIsChecking(true)
    try {
      return await connectivityService.verifyConnection()
    } finally {
      setIsChecking(false)
    }
  }

  return {
    isOnline,
    isChecking,
    checkConnection,
  }
}
