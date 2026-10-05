import React from 'react'
import { AlertTriangle, CheckCircle2, HelpCircle, Trash2 } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary' | 'success'
  isLoading?: boolean
  icon?: React.ReactNode
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const getIcon = () => {
    if (icon) return icon
    switch (variant) {
      case 'danger':
        return <Trash2 className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />
      default:
        return <HelpCircle className="w-5 h-5 text-blue-600" />
    }
  }

  const getIconBg = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-50 border-red-100'
      case 'warning':
        return 'bg-amber-50 border-amber-100'
      case 'success':
        return 'bg-emerald-50 border-emerald-100'
      default:
        return 'bg-blue-50 border-blue-100'
    }
  }

  const getButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'danger'
      case 'success':
        return 'success'
      default:
        return 'primary'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={!isLoading}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={getButtonVariant()}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${getIconBg()}`}
        >
          {getIcon()}
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900 leading-tight">
            {title}
          </h4>
          <p className="text-sm text-slate-600 mt-1 leading-normal">
            {description}
          </p>
        </div>
      </div>
    </Modal>
  )
}
