import mongoose from 'mongoose';

const TrialSchema = new mongoose.Schema(
  {
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    // Simple caps to keep MVP predictable and low-cost
    caps: {
      funnelsPublished: { type: Number, default: 1 },
      leads: { type: Number, default: 100 },
      emails: { type: Number, default: 50 },
    },
  },
  { _id: false }
);

const UsageSchema = new mongoose.Schema(
  {
    funnelsPublished: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    emails: { type: Number, default: 0 },
  },
  { _id: false }
);

const WalletSchema = new mongoose.Schema(
  {
    balance: { type: Number, default: 0 }, // "credits"
    currency: { type: String, default: 'KES' },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    trial: { type: TrialSchema, required: true },
    usage: { type: UsageSchema, default: () => ({}) },
    wallet: { type: WalletSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', UserSchema);

