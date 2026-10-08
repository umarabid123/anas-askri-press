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
    <header className="px-6 py-3.5 flex items-center justify-between shrink-0 select-none bg-[#EEF4F8]">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <ShopLogo className="w-10 h-10" />
        <div>
          <h1 className="text-[19px] font-bold text-slate-900 tracking-tight leading-tight">
            {settings.businessName}
          </h1>
          {settings.subtitle && <p className="text-[13px] text-slate-500 font-normal leading-tight mt-0.5">
            {settings.subtitle}
          </p>}
        </div>
      </div>

      {/* Right Side: Sync status + Date & Time */}
      <div className="flex items-center gap-4">
        {/* Data Continuity UX */}
        <SyncStatusIndicator />

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-slate-600 font-medium text-[13px] bg-white/70 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <Calendar className="w-4 h-4 text-slate-500 stroke-[2.2]" />
          <span>{formattedDate}</span>
          <span className="font-semibold text-slate-700 ml-0.5">{formattedTime}</span>
        </div>
      </div>
    </header>
  )
}

