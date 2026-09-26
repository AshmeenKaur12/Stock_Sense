import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/features/auth/api';
import { api, setAuthFailureHandler } from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { disconnectSocket, getSocket, SocketEvents } from '@/lib/socket';
import type { AppNotification } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

/** Restores the session on boot (/auth/me, with silent refresh) and logs out on refresh failure. */
function useSessionBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    setAuthFailureHandler(() => {
      disconnectSocket();
      clear();
    });
    let cancelled = false;
    authApi
      .me()
      .then(({ user }) => !cancelled && setUser(user))
      .catch(() => !cancelled && clear());
    return () => {
      cancelled = true;
    };
  }, [setUser, clear]);
}

interface LowStockPayload {
  type: 'low_stock' | 'out_of_stock';
  product: { _id: string; sku: string; name: string };
  warehouse: { shortCode: string };
  free: number;
  minQty: number;
}

/**
 * Socket.IO → TanStack Query bridge. Every server event invalidates the affected
 * queries so dashboards, stock and lists update without a refresh; alerts toast.
 */
function useRealtime() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const authed = useAuthStore((s) => s.status === 'authenticated');

  useEffect(() => {
    if (!authed) return;
    const socket = getSocket();
    const invalidate = (...keys: readonly (readonly unknown[])[]) => keys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));

    const onStock = () => invalidate(queryKeys.stock.all, queryKeys.moves.all, queryKeys.dashboard.all, queryKeys.operations.all);
    const onOperation = () => invalidate(queryKeys.operations.all, queryKeys.dashboard.all);
    const onDashboard = () => invalidate(queryKeys.dashboard.all);
    const onNotification = (n: AppNotification) => {
      invalidate(queryKeys.notifications.all);
      // Low/out-of-stock toasts come from alert:lowstock (with an action); others toast here.
      if (n.type === 'waiting' || n.type === 'late') toast.warning(n.title, { description: n.body });
    };
    const onLowStock = (p: LowStockPayload) => {
      const out = p.type === 'out_of_stock';
      toast.warning(out ? `Out of stock · ${p.product.name}` : `Low stock · ${p.product.name}`, {
        description: out ? `No free stock left in ${p.warehouse.shortCode}.` : `Only ${p.free} left in ${p.warehouse.shortCode} (min ${p.minQty}).`,
        action: { label: 'Create receipt', onClick: () => navigate(`/operations/receipts/new?product=${p.product._id}`) },
      });
    };

    // The handshake uses the 15-min access cookie; after it expires, refresh via the API and retry.
    let retrying = false;
    const onConnectError = (err: Error) => {
      if (err.message !== 'unauthorized' || retrying) return;
      retrying = true;
      api
        .get('/auth/me')
        .then(() => socket.connect())
        .catch(() => undefined)
        .finally(() => {
          retrying = false;
        });
    };

    socket.on('connect_error', onConnectError);
    socket.on(SocketEvents.StockUpdated, onStock);
    socket.on(SocketEvents.OperationUpdated, onOperation);
    socket.on(SocketEvents.DashboardRefresh, onDashboard);
    socket.on(SocketEvents.NotificationNew, onNotification);
    socket.on(SocketEvents.LowStockAlert, onLowStock);
    return () => {
      socket.off('connect_error', onConnectError);
      socket.off(SocketEvents.StockUpdated, onStock);
      socket.off(SocketEvents.OperationUpdated, onOperation);
      socket.off(SocketEvents.DashboardRefresh, onDashboard);
      socket.off(SocketEvents.NotificationNew, onNotification);
      socket.off(SocketEvents.LowStockAlert, onLowStock);
    };
  }, [authed, qc, navigate]);
}

/** Root route element: restores the session and wires realtime for every page. */
export function SessionRoot() {
  useSessionBootstrap();
  useRealtime();
  return <Outlet />;
}
