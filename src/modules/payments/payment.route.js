import { Router } from 'express';
import * as paymentController from './payment.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createCheckoutSessionSchema } from './payment.schema.js';

const router = Router();

router.post(
  '/checkout-sessions',
  authenticate,
  validate(createCheckoutSessionSchema),
  paymentController.createCheckoutSession,
);
// No `authenticate` — Stripe calls this, not a logged-in user. Requires the
// raw request body; see the express.raw() wiring in src/app.js.
router.post('/webhook', paymentController.handleWebhook);

export default router;
