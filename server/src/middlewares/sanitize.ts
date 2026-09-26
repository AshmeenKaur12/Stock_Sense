import type { RequestHandler } from 'express';

/**
 * Strips keys starting with `$` or containing `.` from body, query and params to
 * block NoSQL operator injection (e.g. `{ "loginId": { "$ne": null } }`).
 * Equivalent to express-mongo-sanitize, implemented in-house to avoid its
 * incompatibility with Express's getter-only `req.query` in newer versions.
 */
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = clean(v);
    }
    return out;
  }
  return value;
}

export const mongoSanitize: RequestHandler = (req, _res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.params) req.params = clean(req.params) as typeof req.params;
  if (req.query) {
    const sanitized = clean(req.query) as Record<string, unknown>;
    for (const key of Object.keys(req.query)) {
      if (!(key in sanitized)) delete (req.query as Record<string, unknown>)[key];
      else (req.query as Record<string, unknown>)[key] = sanitized[key];
    }
  }
  next();
};
