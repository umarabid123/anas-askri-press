import { create } from 'zustand'
import type { BusinessSettings } from '@/types'

export const useBusinessSettingsStore = create<{
  settings: BusinessSettings | null
  setSettings: (settings: BusinessSettings) => void
}>((set) => ({ settings: null, setSettings: (settings) => set({ settings }) }))
