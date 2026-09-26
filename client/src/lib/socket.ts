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
 * The API origin the socket should connect to. In dev, `VITE_API_URL` is the
 * relative `/api/v1` (proxied by Vite), so there's no separate origin — connect
 * to the current page's origin, same as before. In a production deployment
 * where the frontend and API are on different domains, `VITE_API_URL` is an
 * absolute URL (e.g. `https://stocksense-api.onrender.com/api/v1`); strip the
 * `/api/v1` suffix to get the bare origin Socket.IO needs.
 */
function socketOrigin(): string | undefined {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl || !/^https?:\/\//.test(apiUrl)) return undefined;
  return new URL(apiUrl).origin;
}

/**
 * Lazily connects (through the Vite proxy in dev, so the httpOnly auth cookie
 * is sent with the handshake). Call after login; `disconnectSocket` on logout.
 */
export function getSocket(): Socket {
  socket ??= io(socketOrigin(), { path: '/socket.io', withCredentials: true, autoConnect: false, transports: ['websocket', 'polling'] });
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
