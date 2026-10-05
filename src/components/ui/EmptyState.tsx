import React from 'react'
import { Inbox } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/utils/cn'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionIcon?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-white border border-slate-200/90 shadow-2xs',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3.5 shadow-2xs">
        {icon || <Inbox className="w-7 h-7 stroke-[1.8]" />}
      </div>
      <h3 className="text-base font-bold text-slate-800 leading-tight">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 mt-1 max-w-sm leading-normal">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button
            type="button"
            onClick={onAction}
            leftIcon={actionIcon}
            variant="primary"
            size="md"
          >
            {actionLabel}
          </Button>
        </div>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
