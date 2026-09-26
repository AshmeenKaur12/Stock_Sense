import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { ZodError } from 'zod';
import { isProd } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

export const notFound: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

interface MongoServerError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

function normalize(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return ApiError.unprocessable(
      'Validation failed',
      err.issues.map((i) => ({ field: i.path.join('.') || '_root', message: i.message })),
    );
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return ApiError.unprocessable(
      'Validation failed',
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    );
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2 MB or smaller' : err.message;
    return ApiError.unprocessable(message, [{ field: err.field ?? 'file', message }]);
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for "${err.path}"`, [{ field: err.path, message: 'Invalid value' }]);
  }

  const mongoErr = err as MongoServerError;
  if (mongoErr?.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'field';
    return ApiError.conflict(`A record with this ${field} already exists`, [{ field, message: 'Already exists' }]);
  }

  const type = (err as { type?: string })?.type;
  if (type === 'entity.parse.failed') return ApiError.badRequest('Malformed JSON body');
  if (type === 'entity.too.large') return new ApiError(413, 'Request body too large');

  return new ApiError(500, isProd ? 'Something went wrong' : (err as Error)?.message || 'Internal error');
}

// Express identifies error handlers by arity, so the unused `_next` must stay.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const apiErr = normalize(err);

  if (apiErr.statusCode >= 500) {
    logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  }

  res.status(apiErr.statusCode).json({
    success: false,
    message: apiErr.message,
    errors: apiErr.errors ?? [],
    ...(!isProd && apiErr.statusCode >= 500 ? { stack: (err as Error)?.stack } : {}),
  });
};
