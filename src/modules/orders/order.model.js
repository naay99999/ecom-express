import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    sku: { type: String, required: true },
    options: { type: Map, of: String, default: {} },
    unitPriceAmount: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotalAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema(
  {
    label: String,
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: String,
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    currency: { type: String, enum: ['THB'], required: true, default: 'THB' },
    subtotalAmount: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    shippingAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'cancelled', 'expired'], default: 'pending', index: true },
    reservationExpiresAt: { type: Date, required: true, index: true },
    cancelledAt: Date,
    expiredAt: Date,
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, reservationExpiresAt: 1 });

export default model('Order', orderSchema);
