import { NavLink } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Settings,
  Users,
  UserCheck,
} from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/utils/cn'
import { startNewBill } from '@/features/billing/bill-actions'

interface NavItem {
  name: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { name: 'New Bill', to: ROUTES.NEW_BILL, icon: FileText },
  { name: 'All Bills', to: ROUTES.BILLS, icon: FileText },
  { name: 'Customers', to: ROUTES.CUSTOMERS, icon: Users },
  { name: 'Mazdoori', to: ROUTES.MAZDOORI, icon: UserCheck },
  // { name: 'Reports', to: ROUTES.REPORTS, icon: BarChart2 },
  { name: 'Settings', to: ROUTES.SETTINGS, icon: Settings },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <aside
      className={cn(
        'flex flex-col justify-between select-none shrink-0 py-2 bg-[#EEF4F8] transition-all duration-200',
        sidebarCollapsed ? 'w-18 pl-4 pr-2' : 'w-48 pl-6 pr-3'
      )}
    >
      <div>
        {/* Toggle Collapse Button */}
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className="w-7 h-7 rounded-lg bg-white/70 hover:bg-white text-slate-500 hover:text-slate-800 border border-slate-200/80 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.2]" />
            )}
          </button>
        </div>

        {/* Top Nav Items */}
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={event => { if (item.to === ROUTES.NEW_BILL && !startNewBill()) event.preventDefault() }}
                end
                title={sidebarCollapsed ? item.name : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-xl text-[14px] font-medium transition-all duration-150',
                    sidebarCollapsed
                      ? 'justify-center p-2.5'
                      : 'gap-3 px-3.5 py-2.5',
                    isActive
                      ? 'bg-[#1877F2] text-white font-semibold shadow-sm'
                      : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
                  )
                }
              >
                <Icon className="w-5 h-5 shrink-0 stroke-[2.2]" />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* Bottom "Simple Easy For Everyone" Pill Box
      {sidebarCollapsed ? (
        <div
          className="bg-[#E2EDF8] rounded-xl p-2.5 flex items-center justify-center mb-4 cursor-default shadow-2xs"
          title="Simple Easy For Everyone"
        >
          <Smile className="w-5 h-5 text-slate-700 stroke-[2]" />
        </div>
      ) : (
        <div className="bg-[#E2EDF8] rounded-2xl p-3 flex items-center gap-2.5 mb-4 shadow-2xs">
          <Smile className="w-8 h-8 text-slate-700 shrink-0 stroke-[2]" />
          <div className="text-[12px] font-semibold text-slate-800 leading-[1.25]">
            <p>Simple</p>
            <p>Easy</p>
            <p className="font-normal text-slate-600 text-[11px]">For Everyone</p>
          </div>
        </div>
      )} */}
    </aside>
  )
}

