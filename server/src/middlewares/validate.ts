import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates and coerces request parts. Parsed values replace the originals so
 * handlers receive typed, defaulted data. ZodErrors are formatted by errorHandler.
 */
export const validate =
  ({ body, query, params }: Schemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (params) req.params = params.parse(req.params);
      if (query) req.query = query.parse(req.query);
      if (body) req.body = body.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
