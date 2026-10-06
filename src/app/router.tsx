import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { PageLayout } from '@/components/layout/PageLayout'
import { ROUTES } from '@/constants/routes'
import { NewBillPage } from '@/features/billing/pages/NewBillPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'
import { CustomerDetailPage } from '@/features/customers/pages/CustomerDetailPage'
import { MazdooriPage } from '@/features/mazdoori/pages/MazdooriPage'
import { WorkerDetailPage } from '@/features/mazdoori/pages/WorkerDetailPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'

export function AppRouter() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PageLayout />}>
            <Route index element={<NewBillPage />} />
            <Route path={ROUTES.CUSTOMERS} element={<CustomersPage />} />
            <Route path={ROUTES.CUSTOMER_DETAIL} element={<CustomerDetailPage />} />
            <Route path={ROUTES.MAZDOORI} element={<MazdooriPage />} />
            <Route path={ROUTES.MAZDOOR_DETAIL} element={<WorkerDetailPage />} />
            <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
            {/* Fallback to New Bill */}
            <Route path="*" element={<NewBillPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

