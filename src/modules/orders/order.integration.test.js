import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://unused.test/express';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
process.env.COOKIE_SECRET = 'test-cookie-secret';

const [{ default: User }, { default: Product }, { default: Cart }, { default: Order }, { checkoutOrder, cancelOrder }] = await Promise.all([
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

  it('reserves stock, snapshots order details, clears cart, and restores stock on cancellation', async () => {
    const user = await User.create({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'sup3rSecret!',
      addresses: [{ line1: '1 Main St', city: 'Bangkok', postalCode: '10100', country: 'TH' }],
    });
    const product = await Product.create({
      name: 'Keyboard', slug: 'keyboard', optionNames: [], variants: [{ sku: 'KEYBOARD-DEFAULT', options: {}, priceAmount: 89900, stock: 3 }],
    });
    await Cart.create({ userId: user._id, items: [{ productId: product._id, variantId: product.variants[0]._id, quantity: 2 }] });

    const order = await checkoutOrder(user._id.toString(), { addressId: user.addresses[0]._id.toString() });

    expect(order).toMatchObject({ status: 'pending', currency: 'THB', subtotalAmount: 179800, totalAmount: 179800 });
    expect(order.items[0]).toMatchObject({ productId: product._id, variantId: product.variants[0]._id, sku: 'KEYBOARD-DEFAULT', unitPriceAmount: 89900, quantity: 2 });
    expect(order.shippingAddress).toMatchObject({ line1: '1 Main St', country: 'TH' });
    expect(await Cart.countDocuments({ userId: user._id })).toBe(0);
    expect((await Product.findById(product._id)).variants[0].stock).toBe(1);

    await cancelOrder(order._id.toString(), { userId: user._id.toString(), isAdmin: false });

    expect((await Order.findById(order._id)).status).toBe('cancelled');
    expect((await Product.findById(product._id)).variants[0].stock).toBe(3);
  });
});
