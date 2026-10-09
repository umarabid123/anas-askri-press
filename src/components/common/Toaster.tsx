import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { useToastStore, type ToastMessage } from '@/stores/toast.store'

const styles = {
  success: { Icon: CheckCircle2, color: 'border-emerald-200 bg-emerald-50 text-emerald-900', title: 'Done', delay: 5000 },
  error: { Icon: CircleAlert, color: 'border-red-200 bg-red-50 text-red-900', title: 'Please Check', delay: 10000 },
  info: { Icon: Info, color: 'border-blue-200 bg-blue-50 text-blue-900', title: 'Note', delay: 8000 },
}

function ToastItem({ item }: { item: ToastMessage }) {
  const dismiss = useToastStore(state => state.dismiss)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const { Icon, color, title, delay } = styles[item.kind]

  useEffect(() => {
    if (hovered || focused) return
    const timer = setTimeout(() => dismiss(item.id), delay)
    return () => clearTimeout(timer)
  }, [delay, dismiss, focused, hovered, item.id])

  return (
    <div
      role={item.kind === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border py-2.5 px-3.5 shadow-md w-full max-w-[340px] transition-all duration-200 ${color}`}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-xs font-bold leading-tight">{title}</p>
        <p className="text-xs mt-0.5 leading-snug break-words opacity-90">{item.message}</p>
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Dismiss notification"
        className="p-1 -mr-1 -mt-0.5 rounded-md hover:bg-black/5 shrink-0 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function Toaster() {
  const messages = useToastStore(state => state.messages)
  return createPortal(
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[10000] flex flex-col items-end space-y-2 pointer-events-none print:hidden max-w-[calc(100vw-32px)]"
    >
      {messages.map(item => <ToastItem key={item.id} item={item} />)}
    </div>,
    document.body
  )
}
