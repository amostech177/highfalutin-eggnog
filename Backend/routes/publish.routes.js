import express from 'express';
import { Funnel } from '../models/Funnel.js';

export const publishRouter = express.Router();

// Public read-only funnel render data (published only)
publishRouter.get('/funnel/:slug', async (req, res) => {
  const funnel = await Funnel.findOne({ slug: req.params.slug, published: true }).select('slug name pages published publishedAt');
  if (!funnel) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, funnel });
});

