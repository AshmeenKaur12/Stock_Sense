import { io, type Socket } from 'socket.io-client';

export const SocketEvents = {
  StockUpdated: 'stock:updated',
  OperationUpdated: 'operation:updated',
  DashboardRefresh: 'dashboard:refresh',
  LowStockAlert: 'alert:lowstock',
  NotificationNew: 'notification:new',
} as const;

let socket: Socket | null = null;

/**
 * Lazily connects through the Vite proxy (same origin), so the httpOnly auth
 * cookie is sent with the handshake. Call after login; `disconnectSocket` on logout.
 */
export function getSocket(): Socket {
  socket ??= io({ path: '/socket.io', withCredentials: true, autoConnect: false, transports: ['websocket', 'polling'] });
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
