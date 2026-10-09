import { cn } from '@/utils/cn'

export function ShopLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs overflow-hidden',
        className
      )}
    >
      <img
        src="/logo.png"
        alt="Arki Press Logo"
        className="w-full h-full object-contain p-1"
        loading="eager"
      />
    </div>
  )
}
