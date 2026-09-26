import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LogoMark } from '@/components/common/Logo';
import { hasRole, useAuthStore, type Role } from '@/store/auth';

function SessionSplash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background" role="status" aria-label="Restoring your session">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="size-10 animate-pulse" />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-shimmer rounded-full bg-brand-gradient" />
        </div>
      </div>
    </div>
  );
}

/** Waits for the session restore (/auth/me), then gates the app routes. */
export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === 'idle') return <SessionSplash />;
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return <Outlet />;
}

/** Auth pages bounce signed-in users to the dashboard. */
export function GuestRoute() {
  const status = useAuthStore((s) => s.status);
  if (status === 'idle') return <SessionSplash />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/** Route-level role requirement. */
export function RequireRole({ min, children }: { min: Role; children: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!hasRole(role, min)) return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}

/** Hides UI the current role can't use (the API enforces the same rule). */
export function RoleGate({ min, children, fallback = null }: { min: Role; children: ReactNode; fallback?: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  return <>{hasRole(role, min) ? children : fallback}</>;
}
