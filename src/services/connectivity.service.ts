import { useUIStore } from '@/stores/ui.store'
import { checkSupabaseConnection, isSupabaseConfigured } from './supabase'

type ConnectivityCallback = (isOnline: boolean) => void

class ConnectivityService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
  private listeners: Set<ConnectivityCallback> = new Set()
  private checkInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.initListeners()
  }

  private initListeners() {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => this.handleNetworkChange(true))
    window.addEventListener('offline', () => this.handleNetworkChange(false))

    // Periodic heartbeat check (every 30s)
    this.checkInterval = setInterval(() => {
      this.verifyConnection()
    }, 30000)
  }

  public async verifyConnection(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.handleNetworkChange(false)
      return false
    }

    // If Supabase is configured, test actual end-to-end reachability
    if (isSupabaseConfigured()) {
      const isReachable = await checkSupabaseConnection()
      this.handleNetworkChange(isReachable)
      return isReachable
    }

    // If no Supabase configured, local network is considered online for local app
    this.handleNetworkChange(true)
    return true
  }

  private handleNetworkChange(online: boolean) {
    const previous = this.isOnline
    this.isOnline = online

    // Update global store
    useUIStore.getState().setIsOnline(online)

    // Notify registered subscribers
    if (previous !== online) {
      this.listeners.forEach((callback) => callback(online))
    }
  }

  public subscribe(callback: ConnectivityCallback): () => void {
    this.listeners.add(callback)
    callback(this.isOnline)
    return () => {
      this.listeners.delete(callback)
    }
  }

  public getStatus(): boolean {
    return this.isOnline
  }

  public cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }
}

export const connectivityService = new ConnectivityService()
