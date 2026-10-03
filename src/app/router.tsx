import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { ROUTES } from '@/constants/routes'
import { NewBillPage } from '@/features/billing/pages/NewBillPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'
import { MazdooriPage } from '@/features/mazdoori/pages/MazdooriPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PageLayout />}>
          <Route index element={<NewBillPage />} />
          <Route path={ROUTES.CUSTOMERS} element={<CustomersPage />} />
          <Route path={ROUTES.MAZDOORI} element={<MazdooriPage />} />
          <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          {/* Fallback to New Bill */}
          <Route path="*" element={<NewBillPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
