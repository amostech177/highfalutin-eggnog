import mongoose from 'mongoose';

const BlockSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['heading', 'text', 'button', 'image', 'leadForm'],
      required: true,
    },
    props: { type: Object, default: {} },
  },
  { _id: true }
);

const PageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    blocks: { type: [BlockSchema], default: [] },
  },
  { _id: true }
);

const FunnelSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    pages: { type: [PageSchema], default: () => [{ name: 'Landing', blocks: [] }] },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    // Email notification settings
    ownerNotificationEnabled: { type: Boolean, default: false },
    ownerNotificationTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
    autoresponderEnabled: { type: Boolean, default: false },
    autoresponderTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
  },
  { timestamps: true }
);

FunnelSchema.index({ ownerId: 1, slug: 1 }, { unique: true });

export const Funnel = mongoose.model('Funnel', FunnelSchema);

