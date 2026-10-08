import { create } from 'zustand'
import type { SyncStatus } from '../constants/business'

export interface ConfirmDialogConfig {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary' | 'success'
  onConfirm: () => void | Promise<void>
}

interface UIState {
  sidebarCollapsed: boolean
  syncStatus: SyncStatus
  isOnline: boolean
  lastSyncTime: string | null
  activeModal: string | null
  confirmConfig: ConfirmDialogConfig | null
  isConfirmLoading: boolean

  // Actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSyncStatus: (status: SyncStatus) => void
  setIsOnline: (online: boolean) => void
  setLastSyncTime: (time: string) => void
  openModal: (modalId: string) => void
  closeModal: () => void
  openConfirm: (config: ConfirmDialogConfig) => void
  closeConfirm: () => void
  setConfirmLoading: (loading: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  syncStatus: 'pending',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastSyncTime: null,
  activeModal: null,
  confirmConfig: null,
  isConfirmLoading: false,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  openModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),
  openConfirm: (confirmConfig) => set({ confirmConfig, isConfirmLoading: false }),
  closeConfirm: () => set({ confirmConfig: null, isConfirmLoading: false }),
  setConfirmLoading: (isConfirmLoading) => set({ isConfirmLoading }),
}))
