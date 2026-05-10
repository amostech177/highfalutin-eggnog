import { z } from 'zod';
import { Lead } from '../models/Lead.js';
import { Funnel } from '../models/Funnel.js';
import { EmailTemplate } from '../models/EmailTemplate.js';
import { User } from '../models/User.js';
import { Unsubscribe } from '../models/Unsubscribe.js';
import { ensureCanConsume, debitWallet, incrementUsage } from '../utils/billing.js';
import resend from '../utils/resend.js';
import { randomBytes } from 'crypto';

function generateToken() {
  return randomBytes(16).toString('hex');
}

const CaptureSchema = z.object({
  email: z.string().email(),
  name: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  meta: z.record(z.any()).optional().default({}),
});

function substituteTemplate(template, data) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{{${key}}}`, String(value));
  }
  return result;
}

export const captureLead = async (req, res) => {
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

  // Send owner notification (if enabled)
  if (funnel.ownerNotificationEnabled && funnel.ownerNotificationTemplateId) {
    const template = await EmailTemplate.findById(funnel.ownerNotificationTemplateId);
    if (template) {
      const owner = await User.findById(ownerId);
      const subject = substituteTemplate(template.subject, { lead: parsed.data.email, funnel: funnel.name });
      const htmlBody = substituteTemplate(template.htmlBody, {
        lead: parsed.data.email,
        name: parsed.data.name,
        funnel: funnel.name,
        funnelUrl: `${process.env.PUBLIC_BASE_URL}/admin/leads?funnel=${funnel._id}`
      });
      
      try {
        // Check billing for notification email
        const gate = await ensureCanConsume(ownerId, 'emails', 1);
        if (gate.ok) {
          const fromEmail = process.env.RESEND_FROM_EMAIL;
          const fromName = process.env.RESEND_FROM_NAME;

          await resend.sendEmail({
            to: owner.email,
            from: fromName ? { email: fromEmail, name: fromName } : fromEmail,
            subject,
            html: htmlBody,
            text: template.textBody || '',
          });
          if (gate.mode === 'wallet') {
            await debitWallet({ userId: ownerId, amount: 1, reason: 'owner_notification', reference: `lead:${lead._id}` });
          } else {
            await incrementUsage(ownerId, 'emails', 1);
          }
        } else {
          console.warn('Owner notification skipped — insufficient credits:', gate.message);
        }
      } catch (err) {
        console.error('Owner notification failed:', err.message);
      }
    }
  }

  // Send autoresponder to lead (if enabled)
  if (funnel.autoresponderEnabled && funnel.autoresponderTemplateId) {
    const template = await EmailTemplate.findById(funnel.autoresponderTemplateId);
    if (template) {
      // Generate unsubscribe token for this lead
      const unsubscribeToken = generateToken();
      
      // Save unsubscribe token temporarily (no need to persist yet, but could be stored)
      // We'll generate the unsubscribe URL
      const unsubscribeUrl = `${process.env.PUBLIC_BASE_URL}/api/unsubscribe?token=${unsubscribeToken}&email=${encodeURIComponent(parsed.data.email)}`;
      
      const subject = substituteTemplate(template.subject, {
        name: parsed.data.name || '',
        funnel: funnel.name,
      });

      const context = {
        name: parsed.data.name || '',
        funnel: funnel.name,
        unsubscribe_url: unsubscribeUrl,
        leadEmail: parsed.data.email,
        leadId: lead._id.toString(),
        currentYear: new Date().getFullYear(),
      };

      const htmlBody = substituteTemplate(template.htmlBody, context);
      const textBody = substituteTemplate(template.textBody || '', context);

      try {
        // Check billing for autoresponder
        const gate = await ensureCanConsume(ownerId, 'emails', 1);
        if (gate.ok) {
          const fromEmail = process.env.RESEND_FROM_EMAIL;
          const fromName = process.env.RESEND_FROM_NAME;

          await resend.sendEmail({
            to: parsed.data.email,
            from: fromName ? { email: fromEmail, name: fromName } : fromEmail,
            subject,
            html: htmlBody,
            text: textBody,
          });
          if (gate.mode === 'wallet') {
            await debitWallet({ userId: ownerId, amount: 1, reason: 'autoresponder', reference: `lead:${lead._id}` });
          } else {
            await incrementUsage(ownerId, 'emails', 1);
          }
        } else {
          console.warn('Autoresponder skipped — insufficient credits:', gate.message);
        }
      } catch (err) {
        console.error('Autoresponder failed:', err.message);
      }
    }
  }

  res.json({ success: true, leadId: lead._id });
};

export const listLeads = async (req, res) => {
  const { funnelId, limit = '50', offset = '0' } = req.query;
  const q = { ownerId: req.user.id };
  if (funnelId) q.funnelId = funnelId;

  const leads = await Lead.find(q)
    .sort({ createdAt: -1 })
    .skip(Number(offset))
    .limit(Math.min(Number(limit), 200));

  res.json({ success: true, leads });
};
