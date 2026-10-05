import React from 'react'
import { Minus, Plus, Search, X } from 'lucide-react'
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

export interface SearchInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  onClear?: () => void
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, placeholder = 'Search...', value, onClear, onChange, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        leftIcon={<Search className="w-4 h-4 text-slate-400 stroke-[2.2]" />}
        rightIcon={
          value && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-slate-400 hover:text-slate-600 pointer-events-auto transition-colors p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : undefined
        }
        className={cn('bg-slate-50 border-slate-200 focus:bg-white', className)}
        {...props}
      />
    )
  }
)

SearchInput.displayName = 'SearchInput'

export interface NumberInputProps extends Omit<InputProps, 'type'> {
  showStepper?: boolean
  min?: number
  max?: number
  step?: number
  onValueChange?: (val: number) => void
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      showStepper = false,
      min,
      max,
      step = 1,
      value,
      onChange,
      onValueChange,
      ...props
    },
    ref
  ) => {
    const handleStep = (direction: 1 | -1) => {
      const current = typeof value === 'number' ? value : parseFloat(String(value || 0))
      const next = isNaN(current) ? 0 : current + direction * step
      if (min !== undefined && next < min) return
      if (max !== undefined && next > max) return
      onValueChange?.(next)
    }

    if (!showStepper) {
      return (
        <Input
          ref={ref}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          className={cn('text-right font-medium', className)}
          {...props}
        />
      )
    }

    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors shrink-0"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <Input
          ref={ref}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          className={cn('text-center font-semibold', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => handleStep(1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }
)

NumberInput.displayName = 'NumberInput'

export const CurrencyInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ className, leftIcon: _leftIcon, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="number"
        step="any"
        min="0"
        leftIcon={<span className="text-xs font-semibold text-slate-500">Rs</span>}
        className={cn('text-right font-semibold', className)}
        {...props}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
