import { jwtVerify } from 'jose';
import env from '../config/env.js';
import User from '../modules/users/user.model.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

/**
 * Authentication helpers verify access JWTs and attach the small user context
 * consumed by controllers and role checks. Run `authenticate` before `authorize`.
 */
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  return null;
}

/** Verifies the access token and attaches `req.user = { id, role, email }`. */
export async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw new UnauthorizedError('Authentication token missing');

    const { payload } = await jwtVerify(token, accessSecret, { algorithms: ['HS256'], issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE });
    if (payload.type !== 'access' || !payload.sub) throw new UnauthorizedError('Invalid or expired token');
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedError('Invalid or expired token');
    req.user = { id: user._id.toString(), role: user.role, email: user.email };
    next();
  } catch (err) {
    next(err instanceof UnauthorizedError ? err : new UnauthorizedError('Invalid or expired token'));
  }
}

/** Optional auth: attaches req.user when a valid token is present, but never rejects. */
export async function attachUserIfPresent(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const { payload } = await jwtVerify(token, accessSecret, { algorithms: ['HS256'], issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE });
    if (payload.type !== 'access' || !payload.sub) return next();
    const user = await User.findById(payload.sub);
    if (user?.isActive) req.user = { id: user._id.toString(), role: user.role, email: user.email };
  } catch {
    // ignore invalid/expired tokens for optional auth
  }
  next();
}

/** Restricts access to the given roles. Use after `authenticate`. */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError('Authentication required'));
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }
    next();
  };
}
