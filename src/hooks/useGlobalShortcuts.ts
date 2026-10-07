import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { startNewBill } from '@/features/billing/bill-actions'

// F2 or Alt+N opens a new bill from anywhere. Ctrl+N also works in the desktop
// app; Chrome keeps Ctrl+N for itself, so it never reaches the browser version.
export function useGlobalShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (e.key === 'F2' || (e.altKey && !e.ctrlKey && key === 'n') || (e.ctrlKey && !e.altKey && !e.shiftKey && key === 'n')) {
        e.preventDefault()
        if (startNewBill()) navigate(ROUTES.NEW_BILL)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])
}
