import { Store } from 'lucide-react'
import { cn } from '@/utils/cn'

export function ShopLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-10 h-10 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs',
        className
      )}
    >
      <Store className="w-6 h-6 stroke-[2.2]" />
    </div>
  )
}
