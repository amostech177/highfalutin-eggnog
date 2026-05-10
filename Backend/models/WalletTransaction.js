import mongoose from 'mongoose';

const WalletTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true }, // in credits
    reason: { type: String, required: true },
    // Idempotency key so callbacks/retries don't double-charge
    reference: { type: String, required: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ userId: 1, reference: 1 }, { unique: true });

export const WalletTransaction = mongoose.model('WalletTransaction', WalletTransactionSchema);

