import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import User from '../src/modules/users/user.model.js';
import Product from '../src/modules/products/product.model.js';
import Cart from '../src/modules/cart/cart.model.js';

// Seeds a small, self-consistent demo dataset: an admin, a customer with a
// saved Thai address, a handful of products with variants (including an
// out-of-stock/archived one to demo that filtering), and a cart for the
// customer referencing real variant ids.
//
// Not idempotent — it always inserts, so re-running against a database that
// already has this data fails on unique fields (email/slug/sku). Run
// `npm run db:clear` first, or `npm run db:reset` to do both in sequence.

const ADMIN_PASSWORD = 'AdminPass123!';
const CUSTOMER_PASSWORD = 'CustomerPass123!';

try {
  await connectDatabase();

  const admin = await User.create({
    name: 'Grace Hopper',
    email: 'grace@example.com',
    password: ADMIN_PASSWORD,
    role: 'admin',
    phone: '+66 81 111 2222',
  });

  const customer = await User.create({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: CUSTOMER_PASSWORD,
    role: 'customer',
    phone: '+66 81 234 5678',
    addresses: [
      {
        label: 'Home',
        line1: '99/9 Moo 4, Soi Ladprao 15',
        line2: 'Khwaeng Chomphon',
        city: 'Khet Chatuchak',
        state: 'Bangkok',
        postalCode: '10900',
        country: 'TH',
        isDefault: true,
      },
    ],
  });

  const products = await Product.insertMany([
    {
      name: 'Mechanical Keyboard',
      slug: 'mechanical-keyboard',
      description: 'A tactile 75% mechanical keyboard with hot-swappable switches.',
      category: 'electronics',
      optionNames: ['color'],
      variants: [
        { sku: 'KEYBOARD-BLACK', options: { color: 'Black' }, priceAmount: 89900, stock: 25 },
        { sku: 'KEYBOARD-WHITE', options: { color: 'White' }, priceAmount: 92900, stock: 15 },
      ],
      images: ['https://example.com/keyboard.jpg'],
    },
    {
      name: 'Wireless Mouse',
      slug: 'wireless-mouse',
      description: 'Ergonomic wireless mouse with adjustable DPI.',
      category: 'electronics',
      variants: [{ sku: 'MOUSE-DEFAULT', priceAmount: 39900, stock: 50 }],
      images: ['https://example.com/mouse.jpg'],
    },
    {
      name: 'Cotton T-Shirt',
      slug: 'cotton-t-shirt',
      description: '100% combed cotton crew-neck t-shirt.',
      category: 'apparel',
      optionNames: ['size', 'color'],
      variants: [
        { sku: 'TSHIRT-M-BLACK', options: { size: 'M', color: 'Black' }, priceAmount: 29900, stock: 40 },
        { sku: 'TSHIRT-L-BLACK', options: { size: 'L', color: 'Black' }, priceAmount: 29900, stock: 30 },
        { sku: 'TSHIRT-M-WHITE', options: { size: 'M', color: 'White' }, priceAmount: 29900, stock: 0, isActive: false },
      ],
      images: ['https://example.com/tshirt.jpg'],
    },
    {
      name: 'Ceramic Mug',
      slug: 'ceramic-mug',
      description: 'A 350ml matte-finish ceramic mug.',
      category: 'home',
      variants: [{ sku: 'MUG-DEFAULT', priceAmount: 14900, stock: 100 }],
      images: ['https://example.com/mug.jpg'],
    },
  ]);

  const [keyboard, mouse] = products;
  const cart = await Cart.create({
    userId: customer._id,
    items: [
      { productId: keyboard._id, variantId: keyboard.variants[0]._id, quantity: 1 },
      { productId: mouse._id, variantId: mouse.variants[0]._id, quantity: 2 },
    ],
  });

  // eslint-disable-next-line no-console
  console.log('Seeded demo data:');
  // eslint-disable-next-line no-console
  console.log(`  Admin      ${admin.email} / ${ADMIN_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log(`  Customer   ${customer.email} / ${CUSTOMER_PASSWORD} (1 address, cart with ${cart.items.length} line items)`);
  // eslint-disable-next-line no-console
  console.log(`  Products   ${products.length} (${products.flatMap((p) => p.variants).length} variants)`);
} finally {
  await disconnectDatabase();
}
