import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { apiReference } from '@scalar/express-api-reference';

import env from './config/env.js';
import logger from './config/logger.js';
import { apiLimiter } from './middleware/rateLimit.middleware.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';
import { openApiDocument } from './docs/openapi.js';

import authRoutes from './modules/auth/auth.route.js';
import userRoutes from './modules/users/user.route.js';
import productRoutes from './modules/products/product.route.js';
import cartRoutes from './modules/cart/cart.route.js';
import orderRoutes from './modules/orders/order.route.js';
import paymentRoutes from './modules/payments/payment.route.js';
import shippingRoutes from './modules/shipping/shipping.route.js';

/**
 * Composes the Express application: global middleware runs first, then each
 * versioned feature router; not-found and error handlers must remain last.
 */
const app = express();

// Render (and most PaaS hosts) put the app behind their own reverse proxy,
// which is the only hop in front of us — trust exactly one hop so req.ip and
// req.secure reflect the real client via X-Forwarded-*. Without this,
// express-rate-limit (behind apiLimiter below) throws its
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR validation error on the first request
// instead of quietly misreading IPs.
if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(
  helmet({
    // Scalar's /reference page loads its UI bundle from a CDN and runs an
    // inline init script; the default script-src 'self' would block both.
    // Everything else keeps helmet's normal defaults.
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
      },
    },
  }),
);
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGIN.includes('*') || env.CORS_ORIGIN.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
  }),
);
// Stripe webhook signature verification needs the exact raw request body.
// Scoping express.raw() to this one path, registered before the global
// express.json(), works because body-parser-based json() skips re-parsing
// once an earlier parser has already set the body.
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cookieParser(env.COOKIE_SECRET));
app.use(pinoHttp({ logger }));
app.use('/api', apiLimiter);

app.get('/health', (req, res) => res.json({ success: true, message: 'ok' }));

// API documentation (Scalar): the raw OpenAPI document as JSON — importable
// into Postman/Insomnia/etc — and an interactive page rendered from it.
app.get('/openapi.json', (req, res) => res.json(openApiDocument));
app.get('/reference', apiReference({ url: '/openapi.json', pageTitle: 'Express E-commerce API Reference' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/shipping-methods', shippingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
