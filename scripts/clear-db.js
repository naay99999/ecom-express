import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import env from '../src/config/env.js';
import User from '../src/modules/users/user.model.js';
import Product from '../src/modules/products/product.model.js';
import Cart from '../src/modules/cart/cart.model.js';
import Order from '../src/modules/orders/order.model.js';
import RefreshSession from '../src/modules/auth/refreshSession.model.js';
import WebhookEvent from '../src/modules/payments/webhookEvent.model.js';

// Wipes every collection this app owns. Destructive and irreversible —
// intended for local/dev/demo databases only, e.g. before `db:seed` to
// reset to a clean demo state. Guarded against accidental production use;
// pass CONFIRM_PRODUCTION_CLEAR=true to override.
if (env.NODE_ENV === 'production' && process.env.CONFIRM_PRODUCTION_CLEAR !== 'true') {
  throw new Error(
    'Refusing to clear a production database (NODE_ENV=production). Re-run with ' +
      'CONFIRM_PRODUCTION_CLEAR=true if this is really what you want.',
  );
}

// Order matters only for readability of the log output, not correctness —
// deleteMany has no FK constraints to respect here.
const models = { User, Product, Cart, Order, RefreshSession, WebhookEvent };

try {
  await connectDatabase();

  for (const [name, Model] of Object.entries(models)) {
    const { deletedCount } = await Model.deleteMany({});
    // eslint-disable-next-line no-console
    console.log(`Cleared ${name}: ${deletedCount} document(s) removed.`);
  }
} finally {
  await disconnectDatabase();
}
