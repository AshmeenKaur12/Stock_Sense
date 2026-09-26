import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Wraps an async route handler so rejected promises reach the error middleware. */
export const asyncHandler =
  <Req extends Request = Request>(fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req as Req, res, next).catch(next);
  };
