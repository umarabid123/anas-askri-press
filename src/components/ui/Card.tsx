import React from 'react'
import { cn } from '@/utils/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'muted'
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white transition-shadow',
        variant === 'default' && 'border border-slate-200/80 shadow-xs',
        variant === 'bordered' && 'border border-slate-300',
        variant === 'muted' && 'bg-slate-50 border border-slate-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  variant?: 'blue' | 'green' | 'amber' | 'slate'
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'slate',
  className,
}: StatCardProps) {
  const accentClasses = {
    blue: 'border-l-4 border-l-blue-600',
    green: 'border-l-4 border-l-emerald-600',
    amber: 'border-l-4 border-l-amber-500',
    slate: 'border-l-4 border-l-slate-400',
  }

  return (
    <Card className={cn('p-4 flex items-center justify-between', accentClasses[variant], className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {icon && (
        <div className="p-2.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
          {icon}
        </div>
      )}
    </Card>
  )
}
