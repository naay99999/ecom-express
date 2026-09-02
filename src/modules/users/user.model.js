import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const { Schema, model } = mongoose;

/**
 * User and embedded-address persistence shape, including password hashing
 * and safe serialization helpers.
 *
 * Fields mirror Stripe's generic address object 1:1 (line1/line2/city/
 * state/postalCode/country — Stripe has no separate sub-district/district
 * fields for any country). For a Thai address (country: 'TH'): line1 =
 * บ้านเลขที่/หมู่/ซอย/ถนน, line2 = ตำบล/แขวง + extra detail, city =
 * อำเภอ/เขต, state = จังหวัด. `addressSchema` in user.schema.js enforces
 * that state + a 5-digit postalCode are required when country is 'TH';
 * this model schema stays generic (state optional) since not every country
 * has one.
 */
const addressSchema = new Schema(
  {
    label: { type: String, default: 'Home' },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    phone: { type: String },
    addresses: { type: [addressSchema], default: [] },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// Mongoose 9 dropped legacy callback-style (`next`) middleware — hooks are
// plain async functions now; throw to reject, return to proceed.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default model('User', userSchema);
