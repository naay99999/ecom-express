import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const variantSchema = new Schema(
  {
    sku: { type: String, required: true, uppercase: true, trim: true },
    options: { type: Map, of: String, default: {} },
    priceAmount: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

/** Product persistence shape. Schema indexes support common slug and category lookups. */
const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    category: { type: String, trim: true, index: true },
    optionNames: { type: [String], default: [] },
    variants: { type: [variantSchema], required: true },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

productSchema.index({ 'variants.sku': 1 }, { unique: true });

export default model('Product', productSchema);
