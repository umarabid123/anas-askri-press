import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { PageLayout } from '@/components/layout/PageLayout'
import { ROUTES } from '@/constants/routes'
const NewBillPage = lazy(() => import('@/features/billing/pages/NewBillPage').then(module => ({ default: module.NewBillPage })))
const UpdateBillPage = lazy(() => import('@/features/billing/pages/UpdateBillPage').then(module => ({ default: module.UpdateBillPage })))
const CustomersPage = lazy(() => import('@/features/customers/pages/CustomersPage').then(module => ({ default: module.CustomersPage })))
const CustomerDetailPage = lazy(() => import('@/features/customers/pages/CustomerDetailPage').then(module => ({ default: module.CustomerDetailPage })))
const ProductsPage = lazy(() => import('@/features/products/pages/ProductsPage').then(module => ({ default: module.ProductsPage })))
const MazdooriPage = lazy(() => import('@/features/mazdoori/pages/MazdooriPage').then(module => ({ default: module.MazdooriPage })))
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage').then(module => ({ default: module.ReportsPage })))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then(module => ({ default: module.SettingsPage })))

export function AppRouter() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PageLayout />}>
            <Route index element={<Navigate to={ROUTES.NEW_BILL} replace />} />
            <Route path={ROUTES.NEW_BILL} element={<NewBillPage />} />
            <Route path={ROUTES.BILLS} element={<UpdateBillPage />} />
            <Route path={ROUTES.CUSTOMERS} element={<CustomersPage />} />
            <Route path={ROUTES.CUSTOMER_DETAIL} element={<CustomerDetailPage />} />
            <Route path={ROUTES.PRODUCTS} element={<ProductsPage />} />
            <Route path={ROUTES.MAZDOORI} element={<MazdooriPage />} />
            <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
            <Route path="*" element={<Navigate to={ROUTES.NEW_BILL} replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

