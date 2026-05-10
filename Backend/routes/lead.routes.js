import express from 'express';
import { z } from 'zod';
import { Lead } from '../models/Lead.js';
import { Funnel } from '../models/Funnel.js';
import { requireAuth } from '../middleware/auth.js';
import { ensureCanConsume, debitWallet, incrementUsage } from '../utils/billing.js';

export const leadRouter = express.Router();

// Public lead capture (no auth): POST /api/leads/capture/:slug
const CaptureSchema = z.object({
  email: z.string().email(),
  name: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  meta: z.record(z.any()).optional().default({}),
});

leadRouter.post('/capture/:slug', async (req, res) => {
  const parsed = CaptureSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input' });

  const funnel = await Funnel.findOne({ slug: req.params.slug, published: true });
  if (!funnel) return res.status(404).json({ success: false, message: 'Funnel not found' });

  const ownerId = funnel.ownerId.toString();
  const gate = await ensureCanConsume(ownerId, 'leads', 1);
  if (!gate.ok) return res.status(gate.status).json({ success: false, message: gate.message });

  const lead = await Lead.create({
    ownerId,
    funnelId: funnel._id,
    funnelSlug: funnel.slug,
    email: parsed.data.email,
    name: parsed.data.name,
    phone: parsed.data.phone,
    meta: parsed.data.meta,
  });

  if (gate.mode === 'wallet') {
    await debitWallet({
      userId: ownerId,
      amount: 1,
      reason: 'lead_capture',
      reference: `lead:${lead._id.toString()}`,
      meta: { funnelId: funnel._id.toString(), funnelSlug: funnel.slug },
    });
  } else {
    await incrementUsage(ownerId, 'leads', 1);
  }

  res.json({ success: true, leadId: lead._id });
});

// Owner lead list
leadRouter.use(requireAuth);

leadRouter.get('/', async (req, res) => {
  const { funnelId, limit = '50', offset = '0' } = req.query;
  const q = { ownerId: req.user.id };
  if (funnelId) q.funnelId = funnelId;

  const leads = await Lead.find(q)
    .sort({ createdAt: -1 })
    .skip(Number(offset))
    .limit(Math.min(Number(limit), 200));

  res.json({ success: true, leads });
});

