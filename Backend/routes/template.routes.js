import express from 'express';
import { z } from 'zod';
import { EmailTemplate } from '../models/EmailTemplate.js';
import { requireAuth } from '../middleware/auth.js';

export const templateRouter = express.Router();
templateRouter.use(requireAuth);

const CreateTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  textBody: z.string().optional(),
});

templateRouter.post('/', async (req, res) => {
  try {
    const parsed = CreateTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input', errors: parsed.error.errors });

    const template = await EmailTemplate.create({
      ownerId: req.user.id,
      name: parsed.data.name,
      subject: parsed.data.subject,
      htmlBody: parsed.data.htmlBody,
      textBody: parsed.data.textBody || '',
    });

    res.json({ success: true, template });
  } catch (err) {
    console.error('Create template error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

templateRouter.get('/', async (req, res) => {
  try {
    const templates = await EmailTemplate.find({ ownerId: req.user.id })
      .sort({ createdAt: -1 })
      .select('name subject createdAt');

    res.json({ success: true, templates });
  } catch (err) {
    console.error('List templates error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

templateRouter.get('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    res.json({ success: true, template });
  } catch (err) {
    console.error('Get template error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

templateRouter.put('/:id', async (req, res) => {
  try {
    const parsed = CreateTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input', errors: parsed.error.errors });

    const template = await EmailTemplate.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id },
      {
        name: parsed.data.name,
        subject: parsed.data.subject,
        htmlBody: parsed.data.htmlBody,
        textBody: parsed.data.textBody || '',
      },
      { new: true }
    );

    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    res.json({ success: true, template });
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

templateRouter.delete('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
