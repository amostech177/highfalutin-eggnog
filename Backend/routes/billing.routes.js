import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getBillingMe,
  getWalletTransactions,
  sendEmail,
  darajaTopup,
  darajaCallback
} from '../controllers/billing.controller.js';

export const billingRouter = express.Router();

billingRouter.get('/me', requireAuth, getBillingMe);
billingRouter.get('/wallet/transactions', requireAuth, getWalletTransactions);
billingRouter.post('/send-email', requireAuth, sendEmail);
billingRouter.post('/daraja/topup', requireAuth, darajaTopup);
billingRouter.post('/daraja/callback', express.json(), darajaCallback);

