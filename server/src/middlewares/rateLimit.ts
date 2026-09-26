import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env';
import { ApiError } from '../utils/ApiError';

const limiter = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => isTest,
    handler: (_req, _res, next) => next(ApiError.tooMany(message)),
  });

export const loginLimiter = limiter(15 * 60_000, 20, 'Too many login attempts. Please try again in a few minutes.');
export const authLimiter = limiter(15 * 60_000, 30, 'Too many requests. Please try again later.');
/** Live availability checks fire while typing (debounced), so allow a higher burst. */
export const checkLimiter = limiter(60_000, 60, 'Too many requests. Please slow down.');
export const otpLimiter = limiter(15 * 60_000, 10, 'Too many password reset requests. Please try again later.');
