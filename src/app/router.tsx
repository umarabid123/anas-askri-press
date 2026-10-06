import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { PageLayout } from '@/components/layout/PageLayout'
import { ROUTES } from '@/constants/routes'
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then(module => ({ default: module.DashboardPage })))
const NewBillPage = lazy(() => import('@/features/billing/pages/NewBillPage').then(module => ({ default: module.NewBillPage })))
const CustomersPage = lazy(() => import('@/features/customers/pages/CustomersPage').then(module => ({ default: module.CustomersPage })))
const CustomerDetailPage = lazy(() => import('@/features/customers/pages/CustomerDetailPage').then(module => ({ default: module.CustomerDetailPage })))
const MazdooriPage = lazy(() => import('@/features/mazdoori/pages/MazdooriPage').then(module => ({ default: module.MazdooriPage })))
const WorkerDetailPage = lazy(() => import('@/features/mazdoori/pages/WorkerDetailPage').then(module => ({ default: module.WorkerDetailPage })))
const ExpensesPage = lazy(() => import('@/features/expenses/pages/ExpensesPage').then(module => ({ default: module.ExpensesPage })))
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage').then(module => ({ default: module.ReportsPage })))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then(module => ({ default: module.SettingsPage })))

export function AppRouter() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PageLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path={ROUTES.NEW_BILL} element={<NewBillPage />} />
            <Route path={ROUTES.CUSTOMERS} element={<CustomersPage />} />
            <Route path={ROUTES.CUSTOMER_DETAIL} element={<CustomerDetailPage />} />
            <Route path={ROUTES.MAZDOORI} element={<MazdooriPage />} />
            <Route path={ROUTES.MAZDOOR_DETAIL} element={<WorkerDetailPage />} />
            <Route path={ROUTES.EXPENSES} element={<ExpensesPage />} />
            <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
            {/* Fallback to Dashboard */}
            <Route path="*" element={<DashboardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

