import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function PageLayout() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#EEF4F8]">
      <Header />
      <div className="flex flex-1 overflow-hidden pb-4 pr-6">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
