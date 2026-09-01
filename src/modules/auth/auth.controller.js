import * as authService from './auth.service.js';
import env from '../../config/env.js';

/**
 * HTTP adapters for authentication. They pass validated input to the service,
 * return the access token in JSON, and keep the refresh token in an httpOnly cookie.
 */
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
}

export async function register(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ success: true, data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    setRefreshCookie(res, refreshToken);
    res.json({ success: true, data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    const { accessToken, refreshToken } = await authService.refresh(token);
    setRefreshCookie(res, refreshToken);
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await authService.revokeRefreshToken(req.cookies?.refreshToken);
    res.clearCookie('refreshToken', { path: REFRESH_COOKIE_OPTS.path });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    await authService.changePassword(req.user.id, req.body);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
