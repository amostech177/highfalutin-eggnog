import mongoose from 'mongoose';

const CampaignRecipientSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    recipientName: { type: String, default: '' },
    funnelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funnel', index: true },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'bounced', 'opened', 'clicked'],
      default: 'pending',
      index: true
    },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    openedAt: { type: Date },
    clickedAt: { type: Date },
    openToken: { type: String, unique: true, sparse: true },
    clickToken: { type: String, unique: true, sparse: true },
    error: { type: String, default: '' },
  },
  { timestamps: true }
);

CampaignRecipientSchema.index({ campaignId: 1, status: 1 });

export const CampaignRecipient = mongoose.model('CampaignRecipient', CampaignRecipientSchema);
