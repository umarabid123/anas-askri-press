import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  onBack?: () => void
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  backTo,
  onBack,
  actions,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  const showBackButton = !!(backTo || onBack)

  return (
    <div
      className={cn(
        'flex items-center justify-between pb-1 select-none',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {showBackButton && (
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs cursor-pointer active:scale-95"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
          </button>
        )}
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] text-slate-500 mt-0.5 leading-tight">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
