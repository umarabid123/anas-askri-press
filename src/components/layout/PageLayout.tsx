import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { GlobalModalContainer } from '@/components/common/GlobalModalContainer'
import { RouteLoading } from '@/components/common/RouteLoading'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function PageLayout() {
  useGlobalShortcuts()

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden bg-[#EEF4F8]">
      <Header />
      <div className="flex flex-1 overflow-hidden pb-3 sm:pb-4 pr-2 sm:pr-3 lg:pr-4 min-w-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 bg-transparent pr-1">
          <ErrorBoundary>
            <Suspense fallback={<RouteLoading />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Modals & Dialogs Container */}
      <GlobalModalContainer />
    </div>
  )
}

