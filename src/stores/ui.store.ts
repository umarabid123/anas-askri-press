import { create } from 'zustand'
import type { SyncStatus } from '../constants/business'

interface UIState {
  sidebarCollapsed: boolean
  syncStatus: SyncStatus
  isOnline: boolean
  lastSyncTime: string | null
  activeModal: string | null

  // Actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSyncStatus: (status: SyncStatus) => void
  setIsOnline: (online: boolean) => void
  setLastSyncTime: (time: string) => void
  openModal: (modalId: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  syncStatus: 'synced',
  isOnline: navigator.onLine,
  lastSyncTime: null,
  activeModal: null,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  openModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),
}))
