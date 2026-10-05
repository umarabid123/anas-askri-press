import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { GlobalModalContainer } from '@/components/common/GlobalModalContainer'
import { RouteLoading } from '@/components/common/RouteLoading'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function PageLayout() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#EEF4F8]">
      <Header />
      <div className="flex flex-1 overflow-hidden pb-4 pr-6">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-transparent">
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

