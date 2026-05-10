import { z } from 'zod';
import axios from 'axios';
import resend from '../utils/resend.js';

import { User } from '../models/User.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { PendingTopup } from '../models/PendingTopup.js';
import { creditWallet, debitWallet, ensureCanConsume, incrementUsage } from '../utils/billing.js';

export const getBillingMe = async (req, res) => {
  const user = await User.findById(req.user.id).select('email trial usage wallet');
  if (!user) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, user });
};

export const getWalletTransactions = async (req, res) => {
  const tx = await WalletTransaction.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, transactions: tx });
};

const SendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string().min(1),
});

export const sendEmail = async (req, res) => {
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
};

const TopupSchema = z.object({
  phone: z.string().min(10),
  amountKes: z.number().int().min(1),
});

async function getDarajaToken() {
  const key = process.env.SAFARICOM_CONSUMER_KEY;
  const secret = process.env.SAFARICOM_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error('Daraja credentials are not set');
  }
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  try {
    const { data } = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!data.access_token) {
      throw new Error('Access token not in response');
    }
    return data.access_token;
  } catch (error) {
    if (error.response) {
      console.error('Daraja token request failed:', error.response.status, error.response.data);
    } else {
      console.error('Daraja token request failed:', error.message);
    }
    throw error;
  }
}

function darajaTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export const darajaTopup = async (req, res) => {
  const parsed = TopupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input' });

  const shortcode = process.env.DARAJA_TILL_SHORTCODE;
  const passkey = process.env.DARAJA_PASSKEY;
  const callbackUrlBase = process.env.PUBLIC_BASE_URL;
  if (!shortcode || !passkey || !callbackUrlBase) {
    return res.status(500).json({ success: false, message: 'Daraja not configured on server' });
  }

  const timestamp = darajaTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  let token;
  try {
    token = await getDarajaToken();
  } catch (error) {
    console.error('Failed to get Daraja token:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to authenticate with Daraja' });
  }

  const accountRef = `topup-${req.user.id}`;
  const amount = parsed.data.amountKes;
  const phone = parsed.data.phone;

  try {
    const { data } = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: '174379',
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: '254113771886',  // phone number to receive the stk push
        PartyB: '174379',
        PhoneNumber: '254113771886',
        CallBackURL: `${process.env.PUBLIC_BASE_URL}/api/billing/daraja/callback`,
        AccountReference: accountRef,
        TransactionDesc: `Top up ${amount} KES`,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        "Content-Type": "application/json"
      }
    );

    await PendingTopup.create({
      userId: req.user.id,
      phone,
      amountKes: amount,
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID ?? '',
      status: 'pending',
    });

    res.json({ success: true, checkoutRequestId: data.CheckoutRequestID, customerMessage: data.CustomerMessage });
  } catch (error) {
    console.error('Daraja STK push error:', error.response?.data || error.message);
    // If the error is due to invalid token, we might want to return 401
    if (error.response && error.response.status === 401) {
      return res.status(401).json({ success: false, message: 'Invalid auth token' });
    }
    return res.status(500).json({ success: false, message: 'Failed to initiate top up' });
  }
};

export const darajaCallback = async (req, res) => {
  try {
    const stk = req.body?.Body?.stkCallback;
    if (!stk) return res.status(400).json({ ok: false });

    const checkoutRequestId = stk.CheckoutRequestID;
    const resultCode = stk.ResultCode;

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
};
