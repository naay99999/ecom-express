import stripeClient from '../../config/stripe.js';
import env from '../../config/env.js';
import Order from '../orders/order.model.js';
import WebhookEvent from './webhookEvent.model.js';
import * as orderService from '../orders/order.service.js';
import { AppError, BadRequestError, ConflictError, NotFoundError } from '../../utils/errors.js';

/**
 * Mints a Stripe Checkout Session for an existing pending Stripe-method
 * order. Deliberately not part of checkoutOrder: an external HTTP call must
 * never happen inside the checkout Mongo transaction (which already does
 * inventory writes — a slow/failed Stripe response there risks rolling back
 * an otherwise-valid order). Calling this again for the same order (e.g. to
 * retry payment) mints a fresh session.
 */
export async function createCheckoutSession(orderId, userId) {
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) throw new NotFoundError('Order not found');
  if (order.paymentMethod !== 'stripe') throw new BadRequestError('Order does not use Stripe payment');
  if (order.status !== 'pending') throw new ConflictError('Order is not awaiting payment');
  if (!stripeClient) throw new AppError('Stripe is not configured', 500);

  const currency = order.currency.toLowerCase();
  const session = await stripeClient.checkout.sessions.create({
    mode: 'payment',
    line_items: order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency,
        unit_amount: item.unitPriceAmount,
        product_data: { name: item.name },
      },
    })),
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: order.shippingAmount, currency },
          display_name: order.shippingMethod,
        },
      },
    ],
    success_url: `${env.STRIPE_CHECKOUT_SUCCESS_URL}?orderId=${order._id}`,
    cancel_url: `${env.STRIPE_CHECKOUT_CANCEL_URL}?orderId=${order._id}`,
    client_reference_id: order._id.toString(),
    metadata: { orderId: order._id.toString() },
  });

  order.stripeCheckoutSessionId = session.id;
  await order.save();
  return { url: session.url, sessionId: session.id };
}

/**
 * Verifies and handles one Stripe webhook delivery. Idempotent via an
 * insert-first unique index on the event id (WebhookEvent) rather than a
 * transaction: a replayed event fails that insert with 11000 and is
 * silently acknowledged so Stripe stops retrying.
 */
export async function processWebhookEvent(rawBody, signature) {
  if (!stripeClient || !env.STRIPE_WEBHOOK_SECRET) throw new BadRequestError('Stripe webhook is not configured');

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new BadRequestError('Invalid Stripe webhook signature');
  }

  try {
    await WebhookEvent.create({ eventId: event.id, type: event.type, payload: event.data.object });
  } catch (err) {
    if (err.code === 11000) return; // already processed
    throw err;
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object;
      // Delayed-notification payment methods can complete a session while
      // still unpaid — wait for async_payment_succeeded in that case.
      if (session.payment_status === 'unpaid') break;
      await orderService.markOrderPaidFromWebhook({
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
      });
      break;
    }
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed':
      await orderService.cancelOrderFromWebhook({ stripeCheckoutSessionId: event.data.object.id });
      break;
    default:
      break;
  }
}
