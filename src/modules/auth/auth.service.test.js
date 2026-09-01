import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  sessions: [],
  user: { _id: { toString: () => '665f1a2b3c4d5e6f7a8b9c0d' }, role: 'customer', email: 'ada@example.com', isActive: true },
}));

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://unused.test/express';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
process.env.COOKIE_SECRET = 'test-cookie-secret';

vi.mock('../users/user.model.js', () => ({ default: { findById: vi.fn(async () => state.user) } }));

vi.mock('./refreshSession.model.js', () => ({
  default: {
    create: vi.fn(async (session) => state.sessions.push({ ...session, revokedAt: null })),
    findOneAndUpdate: vi.fn(async (filter, update) => {
      const session = state.sessions.find((item) => item.jtiHash === filter.jtiHash && item.userId.toString() === filter.userId && !item.revokedAt && item.expiresAt > filter.expiresAt.$gt);
      if (!session) return null;
      session.revokedAt = update.$set.revokedAt;
      return session;
    }),
    findOne: vi.fn(async (filter) => state.sessions.find((item) => item.jtiHash === filter.jtiHash) || null),
    updateMany: vi.fn(async (filter, update) => {
      state.sessions
        .filter((item) => Object.entries(filter).every(([key, value]) => (value === null ? item[key] === null : item[key] === value)))
        .forEach((item) => { item.revokedAt = update.$set.revokedAt; });
    }),
    updateOne: vi.fn(),
  },
}));

const authService = await import('./auth.service.js');

describe('refresh sessions', () => {
  it('rejects a refresh token after it has been rotated', async () => {
    state.sessions.length = 0;
    const { refreshToken } = await authService.generateTokens(state.user);

    await authService.refresh(refreshToken);

    await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  });
});
