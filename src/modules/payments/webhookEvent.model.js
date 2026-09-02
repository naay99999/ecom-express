import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Audit trail + idempotency guard for processed Stripe webhook events. A
 * unique index on eventId means a replayed event fails to insert (11000)
 * instead of being handled twice — see payment.service.js.
 */
const webhookEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default model('WebhookEvent', webhookEventSchema);
