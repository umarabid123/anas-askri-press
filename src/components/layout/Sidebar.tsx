import { NavLink } from 'react-router-dom'
import {
  BarChart2,
  FileText,
  Settings,
  Smile,
  Users,
  UserCheck,
} from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'

interface NavItem {
  name: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { name: 'New Bill', to: ROUTES.NEW_BILL, icon: FileText },
  { name: 'Customers', to: ROUTES.CUSTOMERS, icon: Users },
  { name: 'Mazdoori', to: ROUTES.MAZDOORI, icon: UserCheck },
  { name: 'Reports', to: ROUTES.REPORTS, icon: BarChart2 },
  { name: 'Settings', to: ROUTES.SETTINGS, icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="w-44 flex flex-col justify-between select-none shrink-0 pl-6 pr-3 py-2 bg-[#EEF4F8]">
      {/* Top Nav Items */}
      <nav className="space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ROUTES.NEW_BILL}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#1877F2] text-white font-semibold shadow-sm'
                    : 'text-slate-700 hover:bg-slate-200/50 hover:text-slate-900'
                )
              }
            >
              <Icon className="w-5 h-5 shrink-0 stroke-[2.2]" />
              <span>{item.name}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom "Simple Easy For Everyone" Pill Box */}
      <div className="bg-[#E2EDF8] rounded-2xl p-3 flex items-center gap-2.5 mb-4">
        <Smile className="w-8 h-8 text-slate-700 shrink-0 stroke-[2]" />
        <div className="text-[12px] font-semibold text-slate-800 leading-[1.25]">
          <p>Simple</p>
          <p>Easy</p>
          <p className="font-normal text-slate-600 text-[11px]">For Everyone</p>
        </div>
      </div>
    </aside>
  )
}
