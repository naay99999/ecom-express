import mongoose from 'mongoose';
import Cart from '../cart/cart.model.js';
import Product from '../products/product.model.js';
import User from '../users/user.model.js';
import Order from './order.model.js';
import { AppError, ConflictError, NotFoundError } from '../../utils/errors.js';
import { parsePagination, paginate } from '../../utils/pagination.js';
import { calculateShippingCost } from '../../utils/shipping/shipping.registry.js';
import stripeClient from '../../config/stripe.js';

const RESERVATION_MS = 15 * 60 * 1000;

function createOrderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function snapshotAddress(address) {
  return {
    label: address.label,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
}

function snapshotOptions(options) {
  if (options instanceof Map) return Object.fromEntries(options);
  if (typeof options?.toObject === 'function') return options.toObject();
  return { ...options };
}

export async function checkoutOrder(userId, { addressId, paymentMethod, shippingMethod }) {
  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      const [cart, user] = await Promise.all([
        Cart.findOne({ userId }).session(session),
        User.findById(userId).session(session),
      ]);
      if (!cart?.items.length) throw new ConflictError('Cart is empty');
      const address = user?.addresses.id(addressId);
      if (!address) throw new NotFoundError('Address not found');

      const items = [];
      for (const cartItem of cart.items) {
        const product = await Product.findOneAndUpdate(
          {
            _id: cartItem.productId,
            isActive: true,
            variants: { $elemMatch: { _id: cartItem.variantId, isActive: true, stock: { $gte: cartItem.quantity } } },
          },
          { $inc: { 'variants.$.stock': -cartItem.quantity } },
          { new: true, session },
        );
        if (!product) throw new ConflictError('One or more products are unavailable');

        const variant = product.variants.id(cartItem.variantId);
        if (!variant) throw new ConflictError('One or more products are unavailable');
        const unitPriceAmount = variant.priceAmount;
        items.push({
          productId: product._id,
          variantId: variant._id,
          name: product.name,
          slug: product.slug,
          sku: variant.sku,
          options: snapshotOptions(variant.options),
          unitPriceAmount,
          quantity: cartItem.quantity,
          lineTotalAmount: unitPriceAmount * cartItem.quantity,
        });
      }

      const subtotalAmount = items.reduce((total, item) => total + item.lineTotalAmount, 0);
      const shippingAddress = snapshotAddress(address);
      const shippingAmount = calculateShippingCost(shippingMethod, {
        items,
        subtotalAmount,
        currency: 'THB',
        shippingAddress,
      });
      const [createdOrder] = await Order.create(
        [
          {
            orderNumber: createOrderNumber(),
            userId,
            items,
            shippingAddress,
            currency: 'THB',
            subtotalAmount,
            taxAmount: 0,
            shippingAmount,
            totalAmount: subtotalAmount + shippingAmount,
            status: 'pending',
            reservationExpiresAt: new Date(Date.now() + RESERVATION_MS),
            paymentMethod,
            shippingMethod,
          },
        ],
        { session },
      );
      await Cart.deleteOne({ _id: cart._id }, { session });
      order = createdOrder;
    });
  } finally {
    await session.endSession();
  }

  return order;
}

function orderFilter(id, userId, isAdmin) {
  return { _id: id, ...(isAdmin ? {} : { userId }) };
}

export async function listOrders({ userId, isAdmin, query }) {
  const filter = { ...(isAdmin ? {} : { userId }) };
  if (query.status) filter.status = query.status;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
  return paginate(Order, filter, parsePagination(query));
}

export async function getOrderById(id, { userId, isAdmin }) {
  const order = await Order.findOne(orderFilter(id, userId, isAdmin));
  if (!order) throw new NotFoundError('Order not found');
  return order;
}

/**
 * Generic conditional status transition, shared by every action below.
 * Requires the order to currently be in one of `fromStatuses`; otherwise
 * throws ConflictError (also how concurrent double-transitions are caught).
 */
async function applyOrderTransition(id, { userId, isAdmin, fromStatuses, toStatus, extraSet = {}, restoreStock = false }) {
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      order = await Order.findOneAndUpdate(
        { ...orderFilter(id, userId, isAdmin), status: { $in: fromStatuses } },
        { $set: { status: toStatus, ...extraSet } },
        { new: true, session },
      );
      if (!order) throw new ConflictError(`Order cannot transition to ${toStatus}`);
      if (restoreStock) {
        await Promise.all(
          order.items.map((item) => Product.updateOne(
            { _id: item.productId, 'variants._id': item.variantId },
            { $inc: { 'variants.$.stock': item.quantity } },
            { session },
          )),
        );
      }
    });
  } finally {
    await session.endSession();
  }
  return order;
}

/** Admin confirms an order is ready to fulfill. COD gates on `pending`
 * (no upfront payment); Stripe gates on `paid` (won't process an unpaid
 * Stripe order). */
export async function confirmOrder(id, context) {
  const existing = await Order.findOne(orderFilter(id, context.userId, true));
  if (!existing) throw new NotFoundError('Order not found');
  const fromStatuses = existing.paymentMethod === 'cod' ? ['pending'] : ['paid'];
  return applyOrderTransition(id, { ...context, isAdmin: true, fromStatuses, toStatus: 'processing' });
}

export async function shipOrder(id, { carrier, trackingNumber }) {
  return applyOrderTransition(id, {
    isAdmin: true,
    fromStatuses: ['processing'],
    toStatus: 'shipped',
    extraSet: { carrier, trackingNumber, shippedAt: new Date() },
  });
}

/** Delivering a COD order is also when it becomes "paid" — there is no
 * upfront payment gate for COD, per product decision. */
export async function deliverOrder(id) {
  const existing = await Order.findById(id);
  if (!existing) throw new NotFoundError('Order not found');
  const extraSet = { deliveredAt: new Date() };
  if (existing.paymentMethod === 'cod' && !existing.paidAt) extraSet.paidAt = new Date();
  return applyOrderTransition(id, { isAdmin: true, fromStatuses: ['shipped'], toStatus: 'delivered', extraSet });
}

async function refundViaStripe(order) {
  if (!stripeClient) throw new AppError('Stripe is not configured', 500);
  if (!order.stripePaymentIntentId) throw new ConflictError('Order has no captured Stripe payment to refund');
  const refund = await stripeClient.refunds.create({ payment_intent: order.stripePaymentIntentId });
  return refund.id;
}

/**
 * Customers may cancel their own order while it's pending/paid/processing;
 * admins may cancel any order in those states. If the order was already
 * paid via Stripe, this refunds it first (never inside the DB transaction —
 * an external API call must not hold a Mongo transaction open) and lands on
 * `refunded` instead of `cancelled`. COD orders are never "paid" before
 * delivery, so a COD cancel is always the plain unpaid path.
 *
 * Known tradeoff: the refund call and the DB transition aren't atomic, so a
 * concurrent double-cancel could refund twice before the second transition
 * loses the race and throws. Acceptable at this scope; production would add
 * Stripe idempotency keys and reconcile via webhook instead.
 */
export async function cancelOrder(id, context) {
  const existing = await Order.findOne(orderFilter(id, context.userId, context.isAdmin));
  if (!existing) throw new NotFoundError('Order not found');
  if (!['pending', 'paid', 'processing'].includes(existing.status)) {
    throw new ConflictError('Order can no longer be cancelled');
  }

  if (existing.paidAt && existing.paymentMethod === 'stripe') {
    const stripeRefundId = await refundViaStripe(existing);
    return applyOrderTransition(id, {
      ...context,
      fromStatuses: [existing.status],
      toStatus: 'refunded',
      restoreStock: true,
      extraSet: { refundedAt: new Date(), stripeRefundId },
    });
  }

  return applyOrderTransition(id, {
    ...context,
    fromStatuses: [existing.status],
    toStatus: 'cancelled',
    restoreStock: true,
    extraSet: { cancelledAt: new Date() },
  });
}

/** Admin-only refund for an order that has already shipped/delivered
 * (a post-fulfillment return) — beyond `cancelOrder`'s pre-shipment scope. */
export async function refundOrder(id, context) {
  const existing = await Order.findOne(orderFilter(id, context.userId, true));
  if (!existing) throw new NotFoundError('Order not found');
  if (!['shipped', 'delivered'].includes(existing.status)) {
    throw new ConflictError('Order is not eligible for refund');
  }

  const extraSet = { refundedAt: new Date() };
  if (existing.paymentMethod === 'stripe') {
    extraSet.stripeRefundId = await refundViaStripe(existing);
  }
  return applyOrderTransition(id, {
    isAdmin: true,
    fromStatuses: [existing.status],
    toStatus: 'refunded',
    restoreStock: true,
    extraSet,
  });
}

/** Called only from a verified Stripe webhook — never from client input.
 * Idempotent: a replayed event for an order that already left `pending`
 * (already paid, or since cancelled) is a silent no-op. */
export async function markOrderPaidFromWebhook({ stripeCheckoutSessionId, stripePaymentIntentId }) {
  const order = await Order.findOne({ stripeCheckoutSessionId });
  if (!order || order.status !== 'pending') return order ?? null;
  return applyOrderTransition(order._id, {
    isAdmin: true,
    fromStatuses: ['pending'],
    toStatus: 'paid',
    extraSet: { paidAt: new Date(), stripePaymentIntentId },
  });
}

/** Called only from a verified Stripe webhook (checkout session expired or
 * async payment failed) — restores stock reserved at checkout. */
export async function cancelOrderFromWebhook({ stripeCheckoutSessionId }) {
  const order = await Order.findOne({ stripeCheckoutSessionId });
  if (!order || order.status !== 'pending') return order ?? null;
  return applyOrderTransition(order._id, {
    isAdmin: true,
    fromStatuses: ['pending'],
    toStatus: 'cancelled',
    restoreStock: true,
    extraSet: { cancelledAt: new Date() },
  });
}

export async function expirePendingOrders(now = new Date()) {
  const candidates = await Order.find({ status: 'pending', reservationExpiresAt: { $lte: now } }).select('_id').lean();
  let expired = 0;
  for (const candidate of candidates) {
    try {
      await applyOrderTransition(candidate._id, {
        isAdmin: true,
        fromStatuses: ['pending'],
        toStatus: 'expired',
        restoreStock: true,
        extraSet: { expiredAt: now },
      });
      expired += 1;
    } catch (err) {
      if (!(err instanceof ConflictError)) throw err;
    }
  }
  return expired;
}
