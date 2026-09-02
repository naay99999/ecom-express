import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  cart: { userId: 'user-1', items: [{ productId: 'product-1', variantId: 'variant-1', quantity: 2 }] },
  order: null,
  deletedCart: false,
  product: { _id: 'product-1', name: 'Keyboard', slug: 'keyboard' },
  variant: { _id: 'variant-1', sku: 'KEYBOARD-DEFAULT', options: {}, priceAmount: 89900, stock: 3 },
  currentOrder: null,
}));

const stripeState = vi.hoisted(() => ({
  refundsCreate: vi.fn(async () => ({ id: 'refund_test_123' })),
}));

vi.mock('mongoose', () => ({
  default: {
    startSession: vi.fn(async () => ({
      withTransaction: async (callback) => callback(),
      endSession: vi.fn(),
    })),
  },
}));

vi.mock('../../config/stripe.js', () => ({
  default: { refunds: { create: (...args) => stripeState.refundsCreate(...args) } },
}));

vi.mock('../cart/cart.model.js', () => ({
  default: {
    findOne: vi.fn(() => ({ session: async () => state.cart })),
    deleteOne: vi.fn(async () => { state.deletedCart = true; }),
  },
}));

vi.mock('../products/product.model.js', () => ({
  default: {
    findOneAndUpdate: vi.fn(async (filter) => {
      const requested = filter.variants.$elemMatch;
      if (filter._id === state.product._id && requested._id === state.variant._id && requested.stock.$gte <= state.variant.stock) {
        state.variant.stock -= requested.stock.$gte;
        return { ...state.product, variants: { id: () => ({ ...state.variant }) } };
      }
      return null;
    }),
    updateOne: vi.fn(),
  },
}));

vi.mock('../users/user.model.js', () => ({
  default: {
    findById: vi.fn(() => ({
      session: async () => ({
        addresses: {
          id: (id) => (id === 'address-1'
            ? { label: 'Home', line1: '1 Main St', city: 'Bangkok', postalCode: '10100', country: 'TH' }
            : null),
        },
      }),
    })),
  },
}));

/** Matches the plain-object `orderFilter`/`{status:{$in:[...]}}` shapes the
 * service builds, against the single in-flight `state.currentOrder`. */
function matchOrder(filter) {
  if (!state.currentOrder) return null;
  if (String(filter._id) !== String(state.currentOrder._id)) return null;
  if (filter.userId && String(filter.userId) !== String(state.currentOrder.userId)) return null;
  if (filter.status) {
    const allowed = filter.status.$in ?? [filter.status];
    if (!allowed.includes(state.currentOrder.status)) return null;
  }
  return { ...state.currentOrder };
}

vi.mock('./order.model.js', () => ({
  default: {
    create: vi.fn(async ([data]) => {
      state.order = data;
      return [data];
    }),
    findOne: vi.fn(async (filter) => matchOrder(filter)),
    findById: vi.fn(async (id) => (state.currentOrder && String(state.currentOrder._id) === String(id) ? { ...state.currentOrder } : null)),
    findOneAndUpdate: vi.fn(async (filter, update) => {
      const matched = matchOrder(filter);
      if (!matched) return null;
      Object.assign(state.currentOrder, update.$set);
      return { ...state.currentOrder };
    }),
  },
}));

const {
  checkoutOrder, confirmOrder, shipOrder, deliverOrder, cancelOrder, refundOrder,
} = await import('./order.service.js');

describe('checkoutOrder', () => {
  it('creates a pending THB order with payment/shipping, reserves stock, and clears the cart', async () => {
    state.cart = { userId: 'user-1', items: [{ productId: 'product-1', variantId: 'variant-1', quantity: 2 }] };
    state.variant.stock = 3;
    state.order = null;
    state.deletedCart = false;

    const order = await checkoutOrder('user-1', { addressId: 'address-1', paymentMethod: 'cod', shippingMethod: 'standard' });

    expect(order).toMatchObject({
      status: 'pending', currency: 'THB', paymentMethod: 'cod', shippingMethod: 'standard',
      subtotalAmount: 179800, shippingAmount: 4000, totalAmount: 183800,
    });
    expect(state.order.items).toEqual([
      expect.objectContaining({ productId: 'product-1', variantId: 'variant-1', sku: 'KEYBOARD-DEFAULT', unitPriceAmount: 89900, quantity: 2, lineTotalAmount: 179800 }),
    ]);
    expect(state.order.shippingAddress).toMatchObject({ line1: '1 Main St', country: 'TH' });
    expect(state.variant.stock).toBe(1);
    expect(state.deletedCart).toBe(true);
  });
});

function seedOrder(overrides) {
  state.currentOrder = {
    _id: 'order-1',
    userId: 'user-1',
    status: 'pending',
    paymentMethod: 'cod',
    items: [{ productId: 'product-1', variantId: 'variant-1', quantity: 2 }],
    ...overrides,
  };
}

describe('order fulfillment lifecycle', () => {
  it('confirmOrder moves a COD order from pending to processing', async () => {
    seedOrder({ paymentMethod: 'cod', status: 'pending' });
    const order = await confirmOrder('order-1', { userId: 'admin-1', isAdmin: true });
    expect(order.status).toBe('processing');
  });

  it('confirmOrder refuses an unpaid Stripe order', async () => {
    seedOrder({ paymentMethod: 'stripe', status: 'pending' });
    await expect(confirmOrder('order-1', { userId: 'admin-1', isAdmin: true })).rejects.toThrow('Order cannot transition to processing');
  });

  it('confirmOrder moves a paid Stripe order to processing', async () => {
    seedOrder({ paymentMethod: 'stripe', status: 'paid' });
    const order = await confirmOrder('order-1', { userId: 'admin-1', isAdmin: true });
    expect(order.status).toBe('processing');
  });

  it('shipOrder sets carrier/tracking and moves processing to shipped', async () => {
    seedOrder({ status: 'processing' });
    const order = await shipOrder('order-1', { carrier: 'Kerry', trackingNumber: 'TH123' });
    expect(order).toMatchObject({ status: 'shipped', carrier: 'Kerry', trackingNumber: 'TH123' });
    expect(order.shippedAt).toBeInstanceOf(Date);
  });

  it('deliverOrder marks a COD order paid at delivery', async () => {
    seedOrder({ status: 'shipped', paymentMethod: 'cod', paidAt: undefined });
    const order = await deliverOrder('order-1');
    expect(order.status).toBe('delivered');
    expect(order.paidAt).toBeInstanceOf(Date);
    expect(order.deliveredAt).toBeInstanceOf(Date);
  });

  it('deliverOrder does not re-stamp paidAt for an already-paid Stripe order', async () => {
    const originalPaidAt = new Date('2026-01-01T00:00:00Z');
    seedOrder({ status: 'shipped', paymentMethod: 'stripe', paidAt: originalPaidAt });
    const order = await deliverOrder('order-1');
    expect(order.paidAt).toBe(originalPaidAt);
  });

  it('cancelOrder restores stock and cancels an unpaid order without touching Stripe', async () => {
    seedOrder({ status: 'pending', paymentMethod: 'cod' });
    stripeState.refundsCreate.mockClear();
    const order = await cancelOrder('order-1', { userId: 'user-1', isAdmin: false });
    expect(order.status).toBe('cancelled');
    expect(order.cancelledAt).toBeInstanceOf(Date);
    expect(stripeState.refundsCreate).not.toHaveBeenCalled();
  });

  it('cancelOrder refunds via Stripe and moves an already-paid order to refunded', async () => {
    seedOrder({ status: 'paid', paymentMethod: 'stripe', paidAt: new Date(), stripePaymentIntentId: 'pi_123' });
    stripeState.refundsCreate.mockClear();
    const order = await cancelOrder('order-1', { userId: 'admin-1', isAdmin: true });
    expect(stripeState.refundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_123' });
    expect(order).toMatchObject({ status: 'refunded', stripeRefundId: 'refund_test_123' });
  });

  it('refundOrder refunds a shipped Stripe order and restores stock', async () => {
    seedOrder({ status: 'shipped', paymentMethod: 'stripe', paidAt: new Date(), stripePaymentIntentId: 'pi_456' });
    stripeState.refundsCreate.mockClear();
    const order = await refundOrder('order-1', { userId: 'admin-1', isAdmin: true });
    expect(stripeState.refundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_456' });
    expect(order.status).toBe('refunded');
  });

  it('refundOrder refuses an order that has not shipped yet', async () => {
    seedOrder({ status: 'pending', paymentMethod: 'cod' });
    await expect(refundOrder('order-1', { userId: 'admin-1', isAdmin: true })).rejects.toThrow('Order is not eligible for refund');
  });
});
