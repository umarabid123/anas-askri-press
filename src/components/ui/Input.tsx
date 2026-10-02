import React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              'w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-50',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export const SearchInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, placeholder = 'Search...', ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        placeholder={placeholder}
        leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        className={cn('bg-slate-50 border-slate-200 focus:bg-white', className)}
        {...props}
      />
    )
  }
)

SearchInput.displayName = 'SearchInput'

export const CurrencyInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ className, leftIcon, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="number"
        step="any"
        min="0"
        leftIcon={<span className="text-xs font-semibold text-slate-500">Rs</span>}
        className={cn('text-right font-medium', className)}
        {...props}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
