import React from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from './Card'
import { cn } from '@/utils/cn'

export interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  variant?: 'blue' | 'green' | 'red' | 'purple' | 'amber' | 'slate'
  trend?: {
    value: string | number
    isPositive?: boolean
    label?: string
  }
  className?: string
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'blue',
  trend,
  className,
  onClick,
}: StatCardProps) {
  const valueColorMap = {
    blue: 'text-[#1877F2]',
    green: 'text-emerald-600',
    red: 'text-red-600',
    purple: 'text-[#8B5CF6]',
    amber: 'text-amber-600',
    slate: 'text-slate-800',
  }

  const iconBgMap = {
    blue: 'bg-blue-50 text-[#1877F2]',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-[#8B5CF6]',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-50 text-slate-600',
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 flex items-center justify-between gap-3.5 shadow-2xs min-w-0 transition-all rounded-2xl border-slate-200/90',
        onClick && 'cursor-pointer hover:border-slate-300 hover:shadow-xs active:scale-[0.99]',
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {icon && (
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-transparent',
              iconBgMap[variant]
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-slate-500 leading-tight truncate">
            {title}
          </p>
          <p
            className={cn(
              'text-[19px] font-bold leading-tight mt-0.5 truncate',
              valueColorMap[variant]
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {trend && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md shrink-0',
            trend.isPositive
              ? 'text-emerald-700 bg-emerald-50'
              : 'text-red-700 bg-red-50'
          )}
        >
          {trend.isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
          <span>{trend.value}</span>
        </div>
      )}
    </Card>
  )
}
