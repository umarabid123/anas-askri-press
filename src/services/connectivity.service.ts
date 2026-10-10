import { useUIStore } from '@/stores/ui.store'
import { checkSupabaseConnection, isSupabaseConfigured } from './supabase'

type ConnectivityCallback = (isOnline: boolean) => void

class ConnectivityService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
  private listeners: Set<ConnectivityCallback> = new Set()
  private checkInterval: ReturnType<typeof setInterval> | null = null

  public start() {
    if (!this.checkInterval) this.initListeners()
    void this.verifyConnection()
  }

  private onlineHandler = () => void this.verifyConnection()
  private offlineHandler = () => this.handleNetworkChange(false)
  private initListeners() {
    if (typeof window === 'undefined') return

    window.addEventListener('online', this.onlineHandler)
    window.addEventListener('offline', this.offlineHandler)

    // Periodic heartbeat check (every 30s)
    this.checkInterval = setInterval(() => {
      void this.verifyConnection()
    }, 30000)
  }

  public async verifyConnection(): Promise<boolean> {
    // If Supabase is configured, test actual end-to-end reachability directly
    if (isSupabaseConfigured()) {
      const isReachable = await checkSupabaseConnection()
      this.handleNetworkChange(isReachable)
      return isReachable
    }

    // If no Supabase configured, local network is considered online for local app
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true
    this.handleNetworkChange(online)
    return online
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
    window.removeEventListener('online', this.onlineHandler)
    window.removeEventListener('offline', this.offlineHandler)
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }
}

export const connectivityService = new ConnectivityService()
