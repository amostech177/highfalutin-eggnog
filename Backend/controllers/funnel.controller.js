import { z } from 'zod';
import { Funnel } from '../models/Funnel.js';
import { Lead } from '../models/Lead.js';
import { Campaign } from '../models/Campaign.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { requireAuth } from '../middleware/auth.js';
import { ensureCanConsume, incrementUsage } from '../utils/billing.js';

export const funnelRouter = requireAuth;

export const listFunnels = async (req, res) => {
  const funnels = await Funnel.find({ ownerId: req.user.id }).sort({ createdAt: -1 }).select('_id name slug published publishedAt createdAt');
  res.json({ success: true, funnels });
};

const CreateFunnelSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export const createFunnel = async (req, res) => {
  const parsed = CreateFunnelSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input' });

  const created = await Funnel.create({
    ownerId: req.user.id,
    name: parsed.data.name,
    slug: parsed.data.slug,
    pages: [{ name: 'Landing', blocks: [] }],
  });

  res.json({ success: true, funnel: created });
};

export const getFunnel = async (req, res) => {
  const funnel = await Funnel.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!funnel) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, funnel });
};

const UpdateFunnelSchema = z.object({
  name: z.string().min(1).optional(),
  pages: z.array(z.object({
    _id: z.any().optional(),
    name: z.string().min(1),
    blocks: z.array(z.object({
      _id: z.any().optional(),
      type: z.enum(['heading', 'text', 'button', 'image', 'leadForm']),
      props: z.record(z.any()).optional(),
    })),
  })).optional(),
  ownerNotificationEnabled: z.boolean().optional(),
  ownerNotificationTemplateId: z.string().nullable().optional(),
  autoresponderEnabled: z.boolean().optional(),
  autoresponderTemplateId: z.string().nullable().optional(),
});

export const updateFunnel = async (req, res) => {
  const parsed = UpdateFunnelSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input' });

  const funnel = await Funnel.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!funnel) return res.status(404).json({ success: false, message: 'Not found' });

  if (parsed.data.name) funnel.name = parsed.data.name;
  if (parsed.data.pages) funnel.pages = parsed.data.pages;
  if (parsed.data.ownerNotificationEnabled !== undefined) funnel.ownerNotificationEnabled = parsed.data.ownerNotificationEnabled;
  if (parsed.data.ownerNotificationTemplateId !== undefined) funnel.ownerNotificationTemplateId = parsed.data.ownerNotificationTemplateId || null;
  if (parsed.data.autoresponderEnabled !== undefined) funnel.autoresponderEnabled = parsed.data.autoresponderEnabled;
  if (parsed.data.autoresponderTemplateId !== undefined) funnel.autoresponderTemplateId = parsed.data.autoresponderTemplateId || null;
  await funnel.save();

  res.json({ success: true, funnel });
};

export const publishFunnel = async (req, res) => {
  const gate = await ensureCanConsume(req.user.id, 'funnelsPublished', 10);
  if (!gate.ok) return res.status(gate.status).json({ success: false, message: gate.message });

  const funnel = await Funnel.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!funnel) return res.status(404).json({ success: false, message: 'Not found' });

  funnel.published = true;
  funnel.publishedAt = new Date();
  await funnel.save();

  await incrementUsage(req.user.id, 'funnelsPublished', 1);

  const publicUrl = `${process.env.PUBLIC_BASE_URL}/p/${funnel.slug}`;
  res.json({ success: true, funnel, publicUrl });
};

export const deleteFunnel = async (req, res) => {
  try {
    const funnel = await Funnel.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!funnel) return res.status(404).json({ success: false, message: 'Funnel not found' });

    // Delete associated leads
    await Lead.deleteMany({ funnelId: funnel._id });

    // Delete associated campaigns and their recipients
    const campaigns = await Campaign.find({ funnelId: funnel._id });
    for (const campaign of campaigns) {
      await CampaignRecipient.deleteMany({ campaignId: campaign._id });
    }
    await Campaign.deleteMany({ funnelId: funnel._id });

    // Delete the funnel
    await Funnel.deleteOne({ _id: funnel._id });

    res.json({ success: true, message: 'Funnel deleted' });
  } catch (err) {
    console.error('Delete funnel error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
