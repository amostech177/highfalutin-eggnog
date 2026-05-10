import express from 'express';
import { z } from 'zod';
import { Funnel } from '../models/Funnel.js';
import { requireAuth } from '../middleware/auth.js';
import { ensureCanConsume, incrementUsage } from '../utils/billing.js';

import { listFunnels, createFunnel, getFunnel, updateFunnel, publishFunnel, deleteFunnel } from '../controllers/funnel.controller.js';

export const funnelRouter = express.Router();

funnelRouter.use(requireAuth);

funnelRouter.get('/', listFunnels);

const CreateFunnelSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

funnelRouter.post('/', createFunnel);

funnelRouter.get('/:id', getFunnel);

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
});

funnelRouter.put('/:id', updateFunnel);

funnelRouter.post('/:id/publish', publishFunnel);

funnelRouter.delete('/:id', deleteFunnel);
