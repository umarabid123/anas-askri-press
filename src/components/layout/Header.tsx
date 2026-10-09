import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { ShopLogo } from '@/components/common/ShopLogo'
import { SyncStatusIndicator } from '@/components/common/SyncStatusIndicator'
import { DEFAULT_SETTINGS, getBusinessSettings } from '@/services/sqlite.service'
import { useBusinessSettingsStore } from '@/stores/business-settings.store'

export function Header() {
  const settings = useBusinessSettingsStore((state) => state.settings) ?? DEFAULT_SETTINGS
  const [now, setNow] = useState(() => new Date())

  useEffect(() => { void getBusinessSettings().catch(console.error) }, [])

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
    <header className="px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 select-none bg-[#EEF4F8] min-w-0">
      {/* Brand Identity */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <ShopLogo className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-base sm:text-[19px] font-bold text-slate-900 tracking-tight leading-tight truncate">
            {settings.businessName}
          </h1>
          {settings.subtitle && <p className="text-xs sm:text-[13px] text-slate-500 font-normal leading-tight mt-0.5 truncate">
            {settings.subtitle}
          </p>}
        </div>
      </div>

      {/* Right Side: Sync status + Date & Time */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Data Continuity UX */}
        <SyncStatusIndicator />

        {/* Date & Time */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600 font-medium text-xs sm:text-[13px] bg-white/70 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 stroke-[2.2]" />
          <span className="hidden sm:inline">{formattedDate}</span>
          <span className="font-semibold text-slate-700 ml-0.5">{formattedTime}</span>
        </div>
      </div>
    </header>
  )
}

