import { describe, expect, it, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  order: null,
  savedOrder: null,
  webhookEventCreateImpl: null,
}));

const stripeState = vi.hoisted(() => ({
  sessionsCreate: vi.fn(async () => ({ id: 'cs_test_123', url: 'https://checkout.stripe.com/cs_test_123' })),
  constructEvent: vi.fn(),
}));

const orderServiceState = vi.hoisted(() => ({
  markOrderPaidFromWebhook: vi.fn(),
  cancelOrderFromWebhook: vi.fn(),
}));

vi.mock('../../config/stripe.js', () => ({
  default: {
    checkout: { sessions: { create: (...args) => stripeState.sessionsCreate(...args) } },
    webhooks: { constructEvent: (...args) => stripeState.constructEvent(...args) },
  },
}));

vi.mock('../../config/env.js', () => ({
  default: {
    STRIPE_CHECKOUT_SUCCESS_URL: 'http://localhost:3000/checkout/success',
    STRIPE_CHECKOUT_CANCEL_URL: 'http://localhost:3000/checkout/cancel',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
  },
}));

vi.mock('../orders/order.model.js', () => ({
  default: {
    findOne: vi.fn(async (filter) => {
      if (!state.order) return null;
      if (String(filter._id) !== String(state.order._id)) return null;
      if (filter.userId && String(filter.userId) !== String(state.order.userId)) return null;
      const orderDoc = { ...state.order };
      orderDoc.save = async () => { state.savedOrder = { ...orderDoc }; };
      return orderDoc;
    }),
  },
}));

vi.mock('./webhookEvent.model.js', () => ({
  default: { create: vi.fn(async (doc) => state.webhookEventCreateImpl(doc)) },
}));

vi.mock('../orders/order.service.js', () => ({
  markOrderPaidFromWebhook: (...args) => orderServiceState.markOrderPaidFromWebhook(...args),
  cancelOrderFromWebhook: (...args) => orderServiceState.cancelOrderFromWebhook(...args),
}));

const { createCheckoutSession, processWebhookEvent } = await import('./payment.service.js');

const baseOrder = {
  _id: 'order-1',
  userId: 'user-1',
  paymentMethod: 'stripe',
  status: 'pending',
  currency: 'THB',
  shippingAmount: 4000,
  shippingMethod: 'standard',
  items: [{ quantity: 2, unitPriceAmount: 89900, name: 'Keyboard' }],
};

beforeEach(() => {
  state.order = { ...baseOrder };
  state.savedOrder = null;
  state.webhookEventCreateImpl = async () => ({});
  stripeState.sessionsCreate.mockClear();
  stripeState.constructEvent.mockReset();
  orderServiceState.markOrderPaidFromWebhook.mockClear();
  orderServiceState.cancelOrderFromWebhook.mockClear();
});

describe('createCheckoutSession', () => {
  it('creates a Stripe Checkout Session and persists its id on the order', async () => {
    const result = await createCheckoutSession('order-1', 'user-1');
    expect(result).toEqual({ url: 'https://checkout.stripe.com/cs_test_123', sessionId: 'cs_test_123' });
    expect(stripeState.sessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'payment',
      client_reference_id: 'order-1',
      metadata: { orderId: 'order-1' },
    }));
    expect(state.savedOrder.stripeCheckoutSessionId).toBe('cs_test_123');
  });

  it('rejects an order that does not belong to the requesting user', async () => {
    await expect(createCheckoutSession('order-1', 'someone-else')).rejects.toThrow('Order not found');
  });

  it('rejects a COD order', async () => {
    state.order.paymentMethod = 'cod';
    await expect(createCheckoutSession('order-1', 'user-1')).rejects.toThrow('Order does not use Stripe payment');
  });

  it('rejects an order that is not awaiting payment', async () => {
    state.order.status = 'paid';
    await expect(createCheckoutSession('order-1', 'user-1')).rejects.toThrow('Order is not awaiting payment');
  });
});

describe('processWebhookEvent', () => {
  it('rejects an invalid signature as a client error, not a raw uncaught error', async () => {
    stripeState.constructEvent.mockImplementation(() => { throw new Error('bad signature'); });
    await expect(processWebhookEvent(Buffer.from('{}'), 'bad-sig')).rejects.toThrow('Invalid Stripe webhook signature');
  });

  it('marks the order paid when a checkout session completes as paid', async () => {
    stripeState.constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123', payment_status: 'paid', payment_intent: 'pi_123' } },
    });
    await processWebhookEvent(Buffer.from('{}'), 'sig');
    expect(orderServiceState.markOrderPaidFromWebhook).toHaveBeenCalledWith({
      stripeCheckoutSessionId: 'cs_test_123',
      stripePaymentIntentId: 'pi_123',
    });
  });

  it('waits for async_payment_succeeded instead of marking paid on an unpaid completed session', async () => {
    stripeState.constructEvent.mockReturnValue({
      id: 'evt_2',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123', payment_status: 'unpaid' } },
    });
    await processWebhookEvent(Buffer.from('{}'), 'sig');
    expect(orderServiceState.markOrderPaidFromWebhook).not.toHaveBeenCalled();
  });

  it('cancels the order when the checkout session expires', async () => {
    stripeState.constructEvent.mockReturnValue({
      id: 'evt_3',
      type: 'checkout.session.expired',
      data: { object: { id: 'cs_test_123' } },
    });
    await processWebhookEvent(Buffer.from('{}'), 'sig');
    expect(orderServiceState.cancelOrderFromWebhook).toHaveBeenCalledWith({ stripeCheckoutSessionId: 'cs_test_123' });
  });

  it('is idempotent: a replayed event id is acknowledged without reprocessing', async () => {
    state.webhookEventCreateImpl = async () => {
      const err = new Error('duplicate key');
      err.code = 11000;
      throw err;
    };
    stripeState.constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123', payment_status: 'paid', payment_intent: 'pi_123' } },
    });
    await processWebhookEvent(Buffer.from('{}'), 'sig');
    expect(orderServiceState.markOrderPaidFromWebhook).not.toHaveBeenCalled();
  });
});
