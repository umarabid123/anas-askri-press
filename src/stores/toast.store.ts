import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'
export interface ToastMessage { id: string; kind: ToastKind; message: string }

export const useToastStore = create<{
  messages: ToastMessage[]
  show: (kind: ToastKind, message: string) => void
  dismiss: (id: string) => void
}>((set) => ({
  messages: [],
  show: (kind, message) => {
    message = message.trim()
    if (!message) return
    set(state => ({ messages: [...state.messages.filter(item => item.kind !== kind || item.message !== message), { id: crypto.randomUUID(), kind, message }].slice(-3) }))
  },
  dismiss: id => set(state => ({ messages: state.messages.filter(item => item.id !== id) })),
}))

export const toast = {
  success: (message: string) => useToastStore.getState().show('success', message),
  error: (message: string) => useToastStore.getState().show('error', message),
  info: (message: string) => useToastStore.getState().show('info', message),
}
