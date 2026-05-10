import express from 'express';
import { z } from 'zod';
import axios from 'axios';
import resend from '../utils/resend.js';

import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { PendingTopup } from '../models/PendingTopup.js';
import { creditWallet, debitWallet, ensureCanConsume, incrementUsage } from '../utils/billing.js';

export const billingRouter = express.Router();

billingRouter.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('email trial usage wallet');
  if (!user) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, user });
});

billingRouter.get('/wallet/transactions', requireAuth, async (req, res) => {
  const tx = await WalletTransaction.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, transactions: tx });
});

// Email: debit 1 credit per email (MVP)
const SendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string().min(1),
});

billingRouter.post('/send-email', requireAuth, async (req, res) => {
  const parsed = SendEmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input' });

  const gate = await ensureCanConsume(req.user.id, 'emails', 1);
  if (!gate.ok) return res.status(gate.status).json({ success: false, message: gate.message });

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !fromEmail) {
    return res.status(500).json({ success: false, message: 'Email not configured on server' });
  }

  const reference = `email:${Date.now()}:${parsed.data.to}`;

  // Charge first (idempotent ref makes retries safe)
  if (gate.mode === 'wallet') {
    await debitWallet({ userId: req.user.id, amount: 1, reason: 'send_email', reference, meta: { to: parsed.data.to } });
  } else {
    await incrementUsage(req.user.id, 'emails', 1);
  }

  const fromName = process.env.RESEND_FROM_NAME;
  await resend.sendEmail({
    to: parsed.data.to,
    from: fromName ? { email: fromEmail, name: fromName } : fromEmail,
    subject: parsed.data.subject,
    text: parsed.data.text,
  });

  res.json({ success: true });
});

// Daraja STK Push (Till/BuyGoods) for top-up.
// Note: This uses "BusinessShortCode" as your Till shortcode.
const TopupSchema = z.object({
  phone: z.string()
    .refine(val => /^254[0-9]{9}$/.test(val), {
      message: "Phone must be in format 254XXXXXXXXX (Kenyan number without + or leading 0)"
    }),
  amountKes: z.number().int().min(1).max(70000),
});

function formatPhoneNumber(phone) {
  // Covex various formats to 254XXXXXXXXX
  let formatted = phone.replace(/\D/g, '');
  if (formatted.startsWith('0')) {
    formatted = '254' + formatted.substring(1);
  } else if (formatted.startsWith('7') && formatted.length === 9) {
    formatted = '254' + formatted;
  } else if (formatted.startsWith('254') && formatted.length === 12) {
    // already correct
  } else if (formatted.startsWith('+254')) {
    formatted = formatted.substring(1);
  }
  return formatted;
}

billingRouter.post('/daraja/topup', requireAuth, async (req, res) => {
  try {
    const parsed = TopupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input', errors: parsed.error.errors });

    //
  const shortcode = process.env.DARAJA_TILL_SHORTCODE;
  const passkey = process.env.DARAJA_PASSKEY;
  const callbackUrlBase = process.env.PUBLIC_BASE_URL;
  if (!shortcode || !passkey || !callbackUrlBase) {
    return res.status(500).json({ 
      success: false, 
      message: 'Daraja not configured on server',
      missing: {
        shortcode: !shortcode,
        passkey: !passkey,
        callbackUrlBase: !callbackUrlBase
      }
    });
  }

  console.log('Daraja config:', {
    shortcode,
    callbackUrlBase,
    fullCallbackUrl: `${callbackUrlBase}/api/billing/daraja/callback`,
    phone: parsed.data.phone
  });

  const timestamp = darajaTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  const token = await getDarajaToken();

  const accountRef = `topup-${req.user.id}`;
  const amount = parsed.data.amountKes;
  const formattedPhone = formatPhoneNumber(parsed.data.phone);

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: formattedPhone,
    PartyB: shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: `${process.env.PUBLIC_BASE_URL}/api/billing/daraja/callback`,
    AccountReference: accountRef,
    TransactionDesc: `Top up ${amount} KES`,
  };

  console.log('Daraja STK Push payload (password omitted):', {
    ...payload,
    Password: '***'
  });

  const { data } = await axios.post(
    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!data.CheckoutRequestID) {
      console.error('Daraja response missing CheckoutRequestID:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response from Daraja - missing CheckoutRequestID');
    }

    await PendingTopup.create({
      userId: req.user.id,
      phone: formattedPhone,
      amountKes: amount,
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID ?? '',
      status: 'pending',
    });

    res.json({ 
      success: true, 
      checkoutRequestId: data.CheckoutRequestID, 
      customerMessage: data.CustomerMessage 
    });
  } catch (error) {
  console.error('=== DARAJA TOPUP ERROR START ===');
  console.error('Error details:', error);
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
    console.error('Data:', JSON.stringify(error.response.data, null, 2));
  } else {
    console.error('No response - message:', error.message);
    console.error('Stack:', error.stack);
  }
  console.error('=== DARAJA TOPUP ERROR END ===');
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate Daraja payment',
      details: error.response?.data || error.message,
      statusCode: error.response?.status
    });
  }
});

async function getDarajaToken() {
  const key = process.env.SAFARICOM_CONSUMER_KEY;
  const secret = process.env.SAFARICOM_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error('Daraja credentials are not set in environment variables');
  }
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  try {
    const { data } = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { 
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
    });
    if (!data.access_token) {
      throw new Error('Access token not in response: ' + JSON.stringify(data));
    }
    return data.access_token;
  } catch (error) {
    console.error('Daraja token request failed:', error.response?.status, error.response?.data || error.message);
    throw new Error(`Failed to get Daraja token: ${error.response?.data?.error?.message || error.message}`);
  }
}

function darajaTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// Daraja callbacks are unauthenticated; we verify and credit wallet by AccountReference.
// For MVP, we map 1 KES == 1 credit (easy), you can change this later.
billingRouter.post('/daraja/callback', express.json(), async (req, res) => {
  try {
    const stk = req.body?.Body?.stkCallback;
    if (!stk) return res.status(400).json({ ok: false });

    const checkoutRequestId = stk.CheckoutRequestID;
    const resultCode = stk.ResultCode;

    // Always acknowledge quickly
    res.json({ ok: true });

    const pending = await PendingTopup.findOne({ checkoutRequestId });
    if (!pending) return;

    const items = stk.CallbackMetadata?.Item ?? [];
    const amount = Number(items.find((i) => i.Name === 'Amount')?.Value ?? 0);
    const mpesaReceipt = String(items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value ?? '');
    const merchantRequestId = String(stk?.MerchantRequestID ?? '');

    pending.rawCallback = req.body;

    if (resultCode !== 0) {
      pending.status = 'failed';
      pending.merchantRequestId = merchantRequestId || pending.merchantRequestId;
      await pending.save();
      return;
    }

    // Minimal safety: if missing receipt/amount, skip credit but mark callback
    pending.status = 'success';
    pending.mpesaReceipt = mpesaReceipt || pending.mpesaReceipt;
    pending.merchantRequestId = merchantRequestId || pending.merchantRequestId;
    await pending.save();

    if (!mpesaReceipt || !amount) return;

    const reference = `mpesa:${mpesaReceipt || checkoutRequestId}`;
    await creditWallet({
      userId: pending.userId.toString(),
      amount,
      reason: 'mpesa_topup',
      reference,
      meta: { checkoutRequestId, mpesaReceipt, amount, merchantRequestId },
    });
  } catch (e) {
    console.error('Daraja callback error', e);
  }
});

