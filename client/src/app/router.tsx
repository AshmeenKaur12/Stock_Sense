import { ShieldAlert } from 'lucide-react';
import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Link, Navigate } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { GuestRoute, ProtectedRoute, RequireRole } from '@/components/common/guards';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { SessionRoot } from './session';

const LandingPage = lazy(() => import('@/features/landing/pages/LandingPage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const SignupPage = lazy(() => import('@/features/auth/pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const VerifyOtpPage = lazy(() => import('@/features/auth/pages/VerifyOtpPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const OperationListPage = lazy(() => import('@/features/operations/pages/OperationListPage'));
const OperationFormPage = lazy(() => import('@/features/operations/pages/OperationFormPage'));
const StockPage = lazy(() => import('@/features/stock/pages/StockPage'));
const MoveHistoryPage = lazy(() => import('@/features/move-history/pages/MoveHistoryPage'));
const SettingsLayout = lazy(() => import('@/features/settings/SettingsLayout'));
const WarehousesPage = lazy(() => import('@/features/settings/pages/WarehousesPage'));
const LocationsPage = lazy(() => import('@/features/settings/pages/LocationsPage'));
const ProductsPage = lazy(() => import('@/features/settings/pages/ProductsPage'));
const CategoriesPage = lazy(() => import('@/features/settings/pages/CategoriesPage'));
const ContactsPage = lazy(() => import('@/features/settings/pages/ContactsPage'));
const UsersPage = lazy(() => import('@/features/settings/pages/UsersPage'));
const ReorderRulesPage = lazy(() => import('@/features/settings/pages/ReorderRulesPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
// Dev-only; `import.meta.env.DEV` is statically false in production so the chunk is never emitted.
const DesignPage = import.meta.env.DEV ? lazy(() => import('./pages/DesignPage')) : null;

function PageFallback() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
      </div>
      <LoadingState variant="table" rows={5} />
    </div>
  );
}

const page = (node: ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>;
const bare = (node: ReactNode) => <Suspense fallback={<div className="min-h-dvh bg-background" />}>{node}</Suspense>;

function ForbiddenPage() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="You don't have access to this page"
      description="Ask an administrator if you need this permission."
      action={
        <Button variant="gradient" asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}

export const router = createBrowserRouter([
  {
    element: <SessionRoot />,
    children: [
      { path: '/', element: bare(<LandingPage />) },
      {
        element: <GuestRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: '/login', element: page(<LoginPage />) },
              { path: '/signup', element: page(<SignupPage />) },
              { path: '/forgot-password', element: page(<ForgotPasswordPage />) },
              { path: '/verify-otp', element: page(<VerifyOtpPage />) },
              { path: '/reset-password', element: page(<ResetPasswordPage />) },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/dashboard', element: page(<DashboardPage />) },
              { path: '/operations', element: <Navigate to="/operations/receipts" replace /> },
              { path: '/operations/:type', element: page(<OperationListPage />) },
              { path: '/operations/:type/:id', element: page(<OperationFormPage />) },
              { path: '/stock', element: page(<StockPage />) },
              { path: '/move-history', element: page(<MoveHistoryPage />) },
              {
                path: '/settings',
                element: page(<SettingsLayout />),
                children: [
                  { index: true, element: <Navigate to="/settings/warehouses" replace /> },
                  { path: 'warehouses', element: page(<WarehousesPage />) },
                  { path: 'locations', element: page(<LocationsPage />) },
                  { path: 'products', element: page(<ProductsPage />) },
                  { path: 'categories', element: page(<CategoriesPage />) },
                  { path: 'contacts', element: page(<ContactsPage />) },
                  { path: 'users', element: page(<RequireRole min="admin"><UsersPage /></RequireRole>) },
                  { path: 'reorder-rules', element: page(<ReorderRulesPage />) },
                ],
              },
              { path: '/profile', element: page(<ProfilePage />) },
              { path: '/forbidden', element: <ForbiddenPage /> },
              ...(DesignPage ? [{ path: '/design', element: page(<DesignPage />) }] : []),
              { path: '*', element: page(<NotFoundPage />) },
            ],
          },
        ],
      },
    ],
  },
]);
