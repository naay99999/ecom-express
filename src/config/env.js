import { z } from 'zod';

/**
 * Validates all runtime configuration once at import time.
 * Tip: import `env` elsewhere instead of reading `process.env` directly.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  JWT_ISSUER: z.string().min(1).default('express-ecommerce-api'),
  JWT_AUDIENCE: z.string().min(1).default('express-ecommerce-client'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

  COOKIE_SECRET: z.string().min(1).default('dev-cookie-secret'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Optional: COD-only environments (and all existing tests) run fine without
  // these. Stripe-method checkout/webhook actions fail with a clear 500 if
  // attempted while unset — see src/config/stripe.js.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CHECKOUT_SUCCESS_URL: z.string().url().default('http://localhost:3000/checkout/success'),
  STRIPE_CHECKOUT_CANCEL_URL: z.string().url().default('http://localhost:3000/checkout/cancel'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment variables:', z.treeifyError(parsed.error));
    process.exit(1);
  }

  const data = parsed.data;
  const corsOrigins = data.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!corsOrigins.length || (data.NODE_ENV === 'production' && corsOrigins.includes('*'))) {
    console.error('❌ CORS_ORIGIN must contain explicit origins in production');
    process.exit(1);
  }

  return { ...data, CORS_ORIGIN: corsOrigins };
}

const env = loadEnv();

export default env;
