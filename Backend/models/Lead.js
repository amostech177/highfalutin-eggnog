import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    funnelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Funnel', required: true, index: true },
    funnelSlug: { type: String, required: true, index: true },
    pageId: { type: String, default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

LeadSchema.index({ ownerId: 1, funnelId: 1, createdAt: -1 });
LeadSchema.index({ email: 1, ownerId: 1 });
LeadSchema.index({ createdAt: -1 });

export const Lead = mongoose.model('Lead', LeadSchema);

