import { Funnel } from '../models/Funnel.js';

export const renderPublicFunnel = async (req, res) => {
  const funnel = await Funnel.findOne({ slug: req.params.slug, published: true }).select('slug name pages published publishedAt');
  if (!funnel) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, funnel });
};
