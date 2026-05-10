import mongoose from 'mongoose';

const UnsubscribeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    token: { type: String, required: true, unique: true },
    reason: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Unsubscribe = mongoose.model('Unsubscribe', UnsubscribeSchema);
