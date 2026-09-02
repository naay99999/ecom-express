import { describe, expect, it, vi } from 'vitest';

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
