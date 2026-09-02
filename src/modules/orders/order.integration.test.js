import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://unused.test/express';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
process.env.COOKIE_SECRET = 'test-cookie-secret';

const stripeState = vi.hoisted(() => ({
  refundsCreate: vi.fn(async () => ({ id: 'refund_test_123' })),
}));

vi.mock('../../config/stripe.js', () => ({
  default: { refunds: { create: (...args) => stripeState.refundsCreate(...args) } },
}));

const [
  { default: User },
  { default: Product },
  { default: Cart },
  { default: Order },
  {
    checkoutOrder, cancelOrder, confirmOrder, shipOrder, deliverOrder, markOrderPaidFromWebhook,
  },
] = await Promise.all([
  import('../users/user.model.js'),
  import('../products/product.model.js'),
  import('../cart/cart.model.js'),
  import('./order.model.js'),
  import('./order.service.js'),
]);

let replSet;
const describeReplicaSet = process.env.RUN_MONGODB_INTEGRATION === 'true' ? describe : describe.skip;

describeReplicaSet('order checkout transaction', () => {
  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());
  }, 60_000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  async function createUserProductCart(stock = 3) {
    const user = await User.create({
      name: 'Ada Lovelace',
      email: `ada-${Date.now()}-${Math.random()}@example.com`,
      password: 'sup3rSecret!',
      addresses: [{ line1: '1 Main St', city: 'Bangkok', postalCode: '10100', country: 'TH' }],
    });
    const product = await Product.create({
      name: 'Keyboard', slug: `keyboard-${Date.now()}-${Math.random()}`, optionNames: [], variants: [{ sku: `KEYBOARD-${Math.random()}`, options: {}, priceAmount: 89900, stock }],
    });
    await Cart.create({ userId: user._id, items: [{ productId: product._id, variantId: product.variants[0]._id, quantity: 2 }] });
    return { user, product };
  }

  it('reserves stock, snapshots order details, clears cart, and restores stock on cancellation', async () => {
    const { user, product } = await createUserProductCart();

    const order = await checkoutOrder(user._id.toString(), {
      addressId: user.addresses[0]._id.toString(),
      paymentMethod: 'cod',
      shippingMethod: 'standard',
    });

    expect(order).toMatchObject({
      status: 'pending', currency: 'THB', paymentMethod: 'cod', shippingMethod: 'standard',
      subtotalAmount: 179800, shippingAmount: 4000, totalAmount: 183800,
    });
    expect(order.items[0]).toMatchObject({ productId: product._id, variantId: product.variants[0]._id, sku: product.variants[0].sku, unitPriceAmount: 89900, quantity: 2 });
    expect(order.shippingAddress).toMatchObject({ line1: '1 Main St', country: 'TH' });
    expect(await Cart.countDocuments({ userId: user._id })).toBe(0);
    expect((await Product.findById(product._id)).variants[0].stock).toBe(1);

    await cancelOrder(order._id.toString(), { userId: user._id.toString(), isAdmin: false });

    expect((await Order.findById(order._id)).status).toBe('cancelled');
    expect((await Product.findById(product._id)).variants[0].stock).toBe(3);
  });

  it('takes a COD order through confirm, ship, and deliver, marking it paid on delivery', async () => {
    const { user, product } = await createUserProductCart();

    const order = await checkoutOrder(user._id.toString(), {
      addressId: user.addresses[0]._id.toString(),
      paymentMethod: 'cod',
      shippingMethod: 'standard',
    });

    await confirmOrder(order._id.toString(), { userId: 'admin', isAdmin: true });
    await shipOrder(order._id.toString(), { carrier: 'Kerry', trackingNumber: 'TH999' });
    const delivered = await deliverOrder(order._id.toString());

    expect(delivered).toMatchObject({ status: 'delivered', carrier: 'Kerry', trackingNumber: 'TH999' });
    expect(delivered.paidAt).toBeInstanceOf(Date);
    expect((await Product.findById(product._id)).variants[0].stock).toBe(1);
  });

  it('refunds a paid Stripe order on cancel and restores stock', async () => {
    const { user, product } = await createUserProductCart();

    const order = await checkoutOrder(user._id.toString(), {
      addressId: user.addresses[0]._id.toString(),
      paymentMethod: 'stripe',
      shippingMethod: 'standard',
    });

    // Simulate a verified Stripe webhook marking the order paid — checkout
    // itself never sets stripeCheckoutSessionId without calling out to
    // Stripe, so set it directly here to stand in for that call.
    await Order.updateOne({ _id: order._id }, { $set: { stripeCheckoutSessionId: 'cs_test_123' } });
    await markOrderPaidFromWebhook({ stripeCheckoutSessionId: 'cs_test_123', stripePaymentIntentId: 'pi_test_123' });
    await confirmOrder(order._id.toString(), { userId: 'admin', isAdmin: true });

    stripeState.refundsCreate.mockClear();
    const cancelled = await cancelOrder(order._id.toString(), { userId: 'admin', isAdmin: true });

    expect(stripeState.refundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_test_123' });
    expect(cancelled).toMatchObject({ status: 'refunded', stripeRefundId: 'refund_test_123' });
    expect((await Product.findById(product._id)).variants[0].stock).toBe(3);
  });
});
