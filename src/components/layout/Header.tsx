import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { ShopLogo } from '@/components/common/ShopLogo'

export function Header() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Format date like: "Thu, 12 Sep 2025"
  const formattedDate = now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  // Format time like: "10:24 AM"
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <header className="px-6 py-3.5 flex items-center justify-between shrink-0 select-none bg-[#EEF4F8]">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <ShopLogo className="w-10 h-10" />
        <div>
          <h1 className="text-[19px] font-bold text-slate-900 tracking-tight leading-tight">
            Arki Press & CNC Shop
          </h1>
          <p className="text-[13px] text-slate-500 font-normal leading-tight mt-0.5">
            Chadar • Dabi • Chogat • Laser Cutting
          </p>
        </div>
      </div>

      {/* Date & Time */}
      <div className="flex items-center gap-2.5 text-slate-600 font-medium text-[13px]">
        <Calendar className="w-4 h-4 text-slate-500 stroke-[2.2]" />
        <span>{formattedDate}</span>
        <span className="ml-1">{formattedTime}</span>
      </div>
    </header>
  )
}
