import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/utils/cn'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
  action?: React.ReactNode
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  className,
  action,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-white border border-red-200 shadow-2xs',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-3.5 shadow-2xs">
        <AlertCircle className="w-7 h-7 stroke-[2]" />
      </div>
      <h3 className="text-base font-bold text-slate-900 leading-tight">
        {title}
      </h3>
      <p className="text-sm text-slate-600 mt-1 max-w-sm leading-normal">
        {message}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button
            type="button"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-4 h-4 stroke-[2.2]" />}
            variant="outline"
            size="md"
          >
            {retryLabel}
          </Button>
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
