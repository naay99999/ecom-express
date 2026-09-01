import mongoose from 'mongoose';
import Cart from '../cart/cart.model.js';
import Product from '../products/product.model.js';
import User from '../users/user.model.js';
import Order from './order.model.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { parsePagination, paginate } from '../../utils/pagination.js';

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

export async function checkoutOrder(userId, { addressId }) {
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
      const [createdOrder] = await Order.create(
        [
          {
            orderNumber: createOrderNumber(),
            userId,
            items,
            shippingAddress: snapshotAddress(address),
            currency: 'THB',
            subtotalAmount,
            taxAmount: 0,
            shippingAmount: 0,
            totalAmount: subtotalAmount,
            status: 'pending',
            reservationExpiresAt: new Date(Date.now() + RESERVATION_MS),
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
  return paginate(Order, filter, parsePagination(query));
}

export async function getOrderById(id, { userId, isAdmin }) {
  const order = await Order.findOne(orderFilter(id, userId, isAdmin));
  if (!order) throw new NotFoundError('Order not found');
  return order;
}

async function transitionPendingOrder(id, { userId, isAdmin, status }) {
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const now = new Date();
      order = await Order.findOneAndUpdate(
        { ...orderFilter(id, userId, isAdmin), status: 'pending' },
        { $set: { status, ...(status === 'cancelled' ? { cancelledAt: now } : { expiredAt: now }) } },
        { new: true, session },
      );
      if (!order) throw new ConflictError('Order can no longer be cancelled');
      await Promise.all(
        order.items.map((item) => Product.updateOne(
          { _id: item.productId, 'variants._id': item.variantId },
          { $inc: { 'variants.$.stock': item.quantity } },
          { session },
        )),
      );
    });
  } finally {
    await session.endSession();
  }
  return order;
}

export async function cancelOrder(id, context) {
  const existing = await Order.findOne(orderFilter(id, context.userId, context.isAdmin));
  if (!existing) throw new NotFoundError('Order not found');
  return transitionPendingOrder(id, { ...context, status: 'cancelled' });
}

export async function expirePendingOrders(now = new Date()) {
  const candidates = await Order.find({ status: 'pending', reservationExpiresAt: { $lte: now } }).select('_id').lean();
  let expired = 0;
  for (const candidate of candidates) {
    try {
      await transitionPendingOrder(candidate._id, { isAdmin: true, status: 'expired' });
      expired += 1;
    } catch (err) {
      if (!(err instanceof ConflictError)) throw err;
    }
  }
  return expired;
}
