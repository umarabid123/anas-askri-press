import { Loader2 } from 'lucide-react'

export function RouteLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex-1 h-full min-h-[300px] flex flex-col items-center justify-center p-8 select-none">
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center mb-3">
        <Loader2 className="w-6 h-6 text-[#1877F2] animate-spin stroke-[2.2]" />
      </div>
      <p className="text-sm font-semibold text-slate-800 leading-tight">
        {message}
      </p>
      <p className="text-xs text-slate-400 mt-1">
        Please wait a moment...
      </p>
    </div>
  )
}
