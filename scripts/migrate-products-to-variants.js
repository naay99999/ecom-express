import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import Product from '../src/modules/products/product.model.js';
import Cart from '../src/modules/cart/cart.model.js';

function legacyPriceAmount(product) {
  if (Number.isInteger(product.priceAmount)) return product.priceAmount;
  if (typeof product.price === 'number') return Math.round(product.price * 100);
  throw new Error(`Product ${product._id} has no migratable price`);
}

try {
  await connectDatabase();
  const products = await Product.collection.find({ variants: { $exists: false } }).toArray();
  const variantIds = new Map();

  for (const product of products) {
    const variantId = new mongoose.Types.ObjectId();
    variantIds.set(product._id.toString(), variantId);
    await Product.collection.updateOne(
      { _id: product._id },
      {
        $set: {
          optionNames: [],
          variants: [{
            _id: variantId,
            sku: `LEGACY-${product._id.toString().toUpperCase()}`,
            options: {},
            priceAmount: legacyPriceAmount(product),
            stock: Number.isInteger(product.stock) ? product.stock : 0,
            images: [],
            isActive: true,
          }],
          isActive: product.isActive !== false,
          archivedAt: product.isActive === false ? (product.archivedAt || new Date()) : null,
        },
        $unset: { price: '', priceAmount: '', stock: '' },
      },
    );
  }

  const carts = await Cart.collection.find({ 'items.variantId': { $exists: false } }).toArray();
  for (const cart of carts) {
    const items = cart.items.map((item) => {
      const variantId = variantIds.get(item.productId.toString());
      return variantId ? { ...item, variantId } : item;
    });
    await Cart.collection.updateOne({ _id: cart._id }, { $set: { items } });
  }

  // eslint-disable-next-line no-console
  console.log(`Migrated ${products.length} products and ${carts.length} carts to variants.`);
} finally {
  await disconnectDatabase();
}
