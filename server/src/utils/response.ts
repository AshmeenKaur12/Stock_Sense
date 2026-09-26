import type { Response } from 'express';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PageMeta;
}

interface SendOptions {
  status?: number;
  message?: string;
  meta?: PageMeta;
}

export function sendSuccess<T>(res: Response, data: T, { status = 200, message, meta }: SendOptions = {}) {
  const body: ApiResponse<T> = { success: true, data };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

/** Parses page/limit query values into safe numbers plus a Mongo skip. */
export function pagination(query: { page?: unknown; limit?: unknown }, maxLimit = 100) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
