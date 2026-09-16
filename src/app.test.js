import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const corsState = vi.hoisted(() => ({ options: undefined }));

vi.mock('cors', () => ({
  default: vi.fn((options) => {
    corsState.options = options;
    return (req, res, next) => next();
  }),
}));

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://unused.test/express';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
process.env.COOKIE_SECRET = 'test-cookie-secret';
process.env.CORS_ORIGIN = '*';

const { default: app } = await import('./app.js');

describe('CORS', () => {
  it('allows requests from any origin when CORS_ORIGIN is *', () => {
    const callback = vi.fn();

    corsState.options.origin('https://frontend.example.test', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
    expect(corsState.options.credentials).toBe(true);
  });
});

describe('GET /api/v1/users/sudlor', () => {
  it('returns KantaKan’s public GitHub profile without authentication', async () => {
    const response = await request(app).get('/api/v1/users/sudlor');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({
        login: 'KantaKan',
        id: 140788074,
        profileUrl: 'https://github.com/KantaKan',
        publicRepos: 95,
      }),
    });
  });
});
