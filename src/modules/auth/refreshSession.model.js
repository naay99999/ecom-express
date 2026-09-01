import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const refreshSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jtiHash: { type: String, required: true, unique: true, index: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model('RefreshSession', refreshSessionSchema);
