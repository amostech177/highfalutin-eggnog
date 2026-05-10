import mongoose from 'mongoose';

const PendingTopupSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    phone: { type: String, required: true },
    amountKes: { type: Number, required: true },
    checkoutRequestId: { type: String, required: true, unique: true, index: true },
    merchantRequestId: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending', index: true },
    mpesaReceipt: { type: String, default: '' },
    rawCallback: { type: Object, default: {} },
  },
  { timestamps: true }
);

export const PendingTopup = mongoose.model('PendingTopup', PendingTopupSchema);

