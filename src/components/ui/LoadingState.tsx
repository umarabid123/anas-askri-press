import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface LoadingStateProps {
  message?: string
  description?: string
  className?: string
  variant?: 'spinner' | 'skeleton-table' | 'skeleton-cards'
  rows?: number
}

export function LoadingState({
  message = 'Loading...',
  description,
  className,
  variant = 'spinner',
  rows = 5,
}: LoadingStateProps) {
  if (variant === 'skeleton-table') {
    return (
      <div className={cn('w-full space-y-2 p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs', className)}>
        <div className="h-9 w-full bg-slate-100 rounded-lg animate-pulse" />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full bg-slate-50 border border-slate-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (variant === 'skeleton-cards') {
    return (
      <div className={cn('grid grid-cols-4 gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3.5 animate-pulse shadow-2xs"
          >
            <div className="w-11 h-11 bg-slate-100 rounded-xl" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-20 bg-slate-100 rounded" />
              <div className="h-5 w-28 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-10 text-center min-h-[180px]',
        className
      )}
    >
      <Loader2 className="w-8 h-8 text-[#1877F2] animate-spin mb-3 stroke-[2.2]" />
      <p className="text-sm font-semibold text-slate-800 leading-tight">
        {message}
      </p>
      {description && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}
    </div>
  )
}
