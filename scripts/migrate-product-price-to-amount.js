import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import Product from '../src/modules/products/product.model.js';

try {
  await connectDatabase();
  const result = await Product.collection.updateMany(
    { price: { $exists: true }, priceAmount: { $exists: false } },
    [
      { $set: { priceAmount: { $round: [{ $multiply: ['$price', 100] }, 0] } } },
      { $unset: 'price' },
    ],
  );
  // eslint-disable-next-line no-console
  console.log(`Migrated ${result.modifiedCount} product price records to priceAmount.`);
} finally {
  await disconnectDatabase();
}
