import mongoose from 'mongoose';

const EmailTemplateSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['notification', 'autoresponder'], required: true, index: true },
    subject: { type: String, required: true },
    htmlBody: { type: String, required: true },
    textBody: { type: String, default: '' },
  },
  { timestamps: true }
);

EmailTemplateSchema.index({ ownerId: 1, createdAt: -1 });

export const EmailTemplate = mongoose.model('EmailTemplate', EmailTemplateSchema);
