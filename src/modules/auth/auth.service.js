import { createHash, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import User from '../users/user.model.js';
import RefreshSession from './refreshSession.model.js';
import env from '../../config/env.js';
import { UnauthorizedError, ConflictError } from '../../utils/errors.js';

/**
 * Auth business logic: manages users and issues signed token pairs without
 * depending on Express request or response objects.
 */
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

const JWT_VERIFY_OPTIONS = {
  algorithms: ['HS256'],
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
};

function hashJti(jti) {
  return createHash('sha256').update(jti).digest('hex');
}

function expiresAt(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) throw new Error('JWT_REFRESH_EXPIRES_IN must use a numeric s, m, h, or d duration');
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(Date.now() + Number(match[1]) * multipliers[match[2]]);
}

async function signToken(user, secret, expiresIn, claims) {
  return new SignJWT({ role: user.role, email: user.email, ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user._id.toString())
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .sign(secret);
}

export async function generateTokens(user, familyId = randomUUID()) {
  const jti = randomUUID();
  const [accessToken, refreshToken] = await Promise.all([
    signToken(user, accessSecret, env.JWT_ACCESS_EXPIRES_IN, { type: 'access' }),
    signToken(user, refreshSecret, env.JWT_REFRESH_EXPIRES_IN, { type: 'refresh', familyId, jti }),
  ]);
  await RefreshSession.create({ userId: user._id, jtiHash: hashJti(jti), familyId, expiresAt: expiresAt(env.JWT_REFRESH_EXPIRES_IN) });
  return { accessToken, refreshToken };
}

export async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) throw new ConflictError('Email already in use');

  const user = await User.create({ name, email, password });
  const tokens = await generateTokens(user);
  return { user: user.toSafeObject(), ...tokens };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid email or password');

  const valid = await user.comparePassword(password);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await generateTokens(user);
  return { user: user.toSafeObject(), ...tokens };
}

export async function refresh(refreshToken) {
  if (!refreshToken) throw new UnauthorizedError('Refresh token missing');

  let payload;
  try {
    ({ payload } = await jwtVerify(refreshToken, refreshSecret, JWT_VERIFY_OPTIONS));
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  if (payload.type !== 'refresh' || typeof payload.jti !== 'string' || typeof payload.familyId !== 'string') {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const now = new Date();
  const session = await RefreshSession.findOneAndUpdate(
    { jtiHash: hashJti(payload.jti), userId: payload.sub, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now } },
    { new: true },
  );
  if (!session) {
    const priorSession = await RefreshSession.findOne({ jtiHash: hashJti(payload.jti) });
    if (priorSession?.familyId) await RefreshSession.updateMany({ familyId: priorSession.familyId, revokedAt: null }, { $set: { revokedAt: now } });
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    await RefreshSession.updateMany({ userId: payload.sub, revokedAt: null }, { $set: { revokedAt: now } });
    throw new UnauthorizedError('User no longer exists or is inactive');
  }

  return generateTokens(user, payload.familyId);
}

export async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;
  try {
    const { payload } = await jwtVerify(refreshToken, refreshSecret, JWT_VERIFY_OPTIONS);
    if (payload.type === 'refresh' && typeof payload.jti === 'string') {
      await RefreshSession.updateOne({ jtiHash: hashJti(payload.jti), revokedAt: null }, { $set: { revokedAt: new Date() } });
    }
  } catch {
    // Logout is intentionally idempotent; always clear the browser cookie.
  }
}

export async function revokeAllUserSessions(userId) {
  await RefreshSession.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new UnauthorizedError('User not found');

  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  user.password = newPassword;
  await user.save();
  await revokeAllUserSessions(user._id);
}
