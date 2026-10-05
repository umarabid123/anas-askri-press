import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useUIStore } from '@/stores/ui.store'

export function GlobalModalContainer() {
  const {
    confirmConfig,
    isConfirmLoading,
    closeConfirm,
    setConfirmLoading,
  } = useUIStore()

  if (!confirmConfig) return null

  const handleConfirm = async () => {
    try {
      setConfirmLoading(true)
      await confirmConfig.onConfirm()
      closeConfirm()
    } catch (err) {
      console.error('Error during modal confirmation:', err)
      setConfirmLoading(false)
    }
  }

  return (
    <ConfirmDialog
      isOpen={!!confirmConfig}
      onClose={closeConfirm}
      onConfirm={handleConfirm}
      title={confirmConfig.title}
      description={confirmConfig.description}
      confirmText={confirmConfig.confirmText || 'Confirm'}
      cancelText={confirmConfig.cancelText || 'Cancel'}
      variant={confirmConfig.variant || 'primary'}
      isLoading={isConfirmLoading}
    />
  )
}
