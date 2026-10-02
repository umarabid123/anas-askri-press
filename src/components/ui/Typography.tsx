import React from 'react'
import { cn } from '@/utils/cn'

export function Display({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={cn('text-3xl font-bold tracking-tight text-slate-900', className)} {...props}>
      {children}
    </h1>
  )
}

export function PageTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={cn('text-xl font-bold tracking-tight text-slate-900', className)} {...props}>
      {children}
    </h1>
  )
}

export function SectionTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-base font-semibold text-slate-800', className)} {...props}>
      {children}
    </h2>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-sm font-semibold text-slate-700 uppercase tracking-wider', className)} {...props}>
      {children}
    </h3>
  )
}

export function Body({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-slate-700 leading-normal', className)} {...props}>
      {children}
    </p>
  )
}

export function BodySmall({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-slate-500 leading-normal', className)} {...props}>
      {children}
    </p>
  )
}

export function Caption({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('text-xs text-slate-400', className)} {...props}>
      {children}
    </span>
  )
}

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('text-xs font-semibold text-slate-700 block mb-1', className)} {...props}>
      {children}
    </label>
  )
}
