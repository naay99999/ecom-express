import * as paymentService from './payment.service.js';

export async function createCheckoutSession(req, res, next) {
  try {
    const session = await paymentService.createCheckoutSession(req.body.orderId, req.user.id);
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}

// Stripe calls this directly (no logged-in user) — signature verification
// inside processWebhookEvent is the auth mechanism, not `authenticate`.
// Never let a raw stripe-sdk error bubble past here: it isn't an AppError,
// so it would otherwise become a wrongly-500'd response instead of the 400
// a bad/missing signature should produce.
export async function handleWebhook(req, res, next) {
  try {
    await paymentService.processWebhookEvent(req.body, req.headers['stripe-signature']);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}
