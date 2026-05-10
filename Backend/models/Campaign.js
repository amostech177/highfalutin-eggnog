import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    textBody: { type: String, required: true },
    funnelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funnel', index: true },
    leadFilter: { type: Object, default: {} },
    scheduledAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled'],
      default: 'draft'
    },
    sentCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CampaignSchema.index({ ownerId: 1, status: 1 });
CampaignSchema.index({ scheduledAt: 1 }, { sparse: true });

export const Campaign = mongoose.model('Campaign', CampaignSchema);
