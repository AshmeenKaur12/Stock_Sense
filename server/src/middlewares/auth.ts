import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { User, type Role } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { ACCESS_COOKIE } from '../utils/cookies';
import { verifyAccessToken } from '../utils/jwt';

export interface AuthUser {
  id: string;
  role: Role;
  loginId: string;
  name: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

const RANK: Record<Role, number> = { staff: 0, manager: 1, admin: 2 };
export const hasRole = (role: Role, min: Role) => RANK[role] >= RANK[min];

/**
 * Verifies the access token (httpOnly cookie, or `Authorization: Bearer` for API
 * clients) and re-reads the user so deactivation and role changes apply immediately.
 */
export const authenticate: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const payload = verifyAccessToken((req.cookies?.[ACCESS_COOKIE] as string | undefined) ?? bearer);
    if (!payload) throw ApiError.unauthorized();

    const user = await User.findById(payload.sub).select('role loginId name isActive').lean();
    if (!user || !user.isActive) throw ApiError.unauthorized('Account is inactive or no longer exists');

    req.user = { id: String(user._id), role: user.role, loginId: user.loginId, name: user.name || user.loginId };
    next();
  } catch (err) {
    next(err);
  }
};

/** Requires at least `min` in the staff < manager < admin hierarchy. Must follow `authenticate`. */
export const requireRole =
  (min: Role): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!hasRole(req.user.role, min)) return next(ApiError.forbidden());
    next();
  };

/** Narrowing helper for handlers mounted behind `authenticate`. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}
