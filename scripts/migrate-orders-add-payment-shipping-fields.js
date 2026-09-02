import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import Order from '../src/modules/orders/order.model.js';

// Backfills pre-existing Order documents from before payment/shipping
// support. Not cosmetic: order.service.js's confirmOrder branches on
// paymentMethod ('cod' -> pending, anything else -> paid) to decide whether
// an order can move to processing — a legacy order with paymentMethod
// undefined would silently misroute into the stripe branch without this.
try {
  await connectDatabase();

  const paymentResult = await Order.collection.updateMany(
    { paymentMethod: { $exists: false } },
    { $set: { paymentMethod: 'cod' } },
  );
  const shippingResult = await Order.collection.updateMany(
    { shippingMethod: { $exists: false } },
    { $set: { shippingMethod: 'standard' } },
  );

  // eslint-disable-next-line no-console
  console.log(
    `Backfilled paymentMethod on ${paymentResult.modifiedCount} orders and shippingMethod on ${shippingResult.modifiedCount} orders.`,
  );
} finally {
  await disconnectDatabase();
}
