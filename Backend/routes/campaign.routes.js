import express from 'express';
import { z } from 'zod';
import { Campaign } from '../models/Campaign.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { Unsubscribe } from '../models/Unsubscribe.js';
import { requireAuth } from '../middleware/auth.js';
import { sendCampaign, trackOpen, trackClick } from '../utils/email-campaign.js';
import mongoose from 'mongoose';

export const campaignRouter = express.Router();
campaignRouter.use(requireAuth);

const CreateCampaignSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  textBody: z.string().min(1),
  funnelId: z.string().optional(),
  leadFilter: z.record(z.any()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

campaignRouter.post('/', async (req, res) => {
  try {
    const parsed = CreateCampaignSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input', errors: parsed.error.errors });

    const { funnelId, scheduledAt, leadFilter } = parsed.data;

    let status = 'draft';
    let scheduledAtDate = null;
    if (scheduledAt) {
      scheduledAtDate = new Date(scheduledAt);
      if (scheduledAtDate > new Date()) {
        status = 'scheduled';
      }
    }

    let funnelIdObj = null;
    if (funnelId) {
      if (!mongoose.Types.ObjectId.isValid(funnelId)) {
        return res.status(400).json({ success: false, message: 'Invalid funnelId format' });
      }
      funnelIdObj = new mongoose.Types.ObjectId(funnelId);
    }

     const campaign = await Campaign.create({
       ownerId: req.user.id,
       name: parsed.data.name,
       subject: parsed.data.subject,
       textBody: parsed.data.textBody,
       funnelId: funnelIdObj,
       leadFilter: leadFilter || {},
       scheduledAt: scheduledAtDate,
       status,
     });

    res.json({ success: true, campaign });
  } catch (err) {
    console.error('Create campaign error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

campaignRouter.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { ownerId: req.user.id };
    if (status && ['draft', 'scheduled', 'sending', 'sent', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const campaigns = await Campaign.find(filter)
      .sort({ createdAt: -1 })
      .select('name status subject sentCount deliveredCount openCount clickCount scheduledAt createdAt');

    res.json({ success: true, campaigns });
  } catch (err) {
    console.error('List campaigns error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

campaignRouter.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const recipients = await CampaignRecipient.find({ campaignId: campaign._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('recipientEmail recipientName status sentAt deliveredAt openedAt clickedAt error');

    res.json({ success: true, campaign, recipients });
  } catch (err) {
    console.error('Get campaign error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

campaignRouter.post('/:id/send', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({ success: false, message: `Campaign is ${campaign.status}, cannot send` });
    }

    // Mark as sending immediately to prevent duplicates
    campaign.status = 'sending';
    await campaign.save();

    // Send in background (non-blocking)
    sendCampaign(campaign._id.toString())
      .then(async () => {
        const updated = await Campaign.findById(campaign._id);
        if (updated && updated.status === 'sending') {
          updated.status = 'sent';
          await updated.save();
        }
      })
      .catch(async (err) => {
        console.error('Campaign send failed:', err);
        const updated = await Campaign.findById(campaign._id);
        if (updated) {
          updated.status = 'draft';
          await updated.save();
        }
      });

    res.json({ success: true, message: 'Campaign sending started' });
  } catch (err) {
    console.error('Send campaign error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

campaignRouter.post('/:id/cancel', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel ${campaign.status} campaign` });
    }

    campaign.status = 'cancelled';
    await campaign.save();

    res.json({ success: true, campaign });
  } catch (err) {
    console.error('Cancel campaign error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

campaignRouter.delete('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    if (!['draft', 'cancelled'].includes(campaign.status)) {
      return res.status(400).json({ success: false, message: 'Can only delete draft or cancelled campaigns' });
    }

    await Campaign.deleteOne({ _id: campaign._id });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete campaign error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
