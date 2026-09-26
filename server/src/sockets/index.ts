import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ACCESS_COOKIE } from '../utils/cookies';
import { verifyAccessToken } from '../utils/jwt';

export const SocketEvents = {
  StockUpdated: 'stock:updated',
  OperationUpdated: 'operation:updated',
  DashboardRefresh: 'dashboard:refresh',
  LowStockAlert: 'alert:lowstock',
  NotificationNew: 'notification:new',
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];

let io: Server | null = null;

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  // Cookie-authenticated handshake: the same httpOnly access token the REST API uses.
  io.use((socket, next) => {
    const payload = verifyAccessToken(readCookie(socket.handshake.headers.cookie, ACCESS_COOKIE));
    if (!payload) return next(new Error('unauthorized'));
    socket.data.userId = payload.sub;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(`user:${userId}`);
    logger.debug({ id: socket.id, userId }, 'socket connected');
  });

  return io;
}

/** Broadcasts to every authenticated client. No-op without a socket server (tests, seed). */
export function emit(event: SocketEvent, payload: unknown): void {
  io?.emit(event, payload);
}

export function emitToUser(userId: string, event: SocketEvent, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export async function closeSocket(): Promise<void> {
  if (!io) return;
  await io.close();
  io = null;
}
