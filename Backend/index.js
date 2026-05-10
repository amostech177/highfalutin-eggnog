import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const _filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(_filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('Connected to MongoDB!')
}).catch((err) => {
  console.log(err);
});

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()).filter(Boolean) ?? '*',
  credentials: true,
}));

app.get('/health', (req, res) => res.json({ ok: true }));

import { authRouter } from './routes/auth.routes.js';
import { funnelRouter } from './routes/funnel.routes.js';
import { publishRouter } from './routes/publish.routes.js';
import { leadRouter } from './routes/lead.routes.js';
import { billingRouter } from './routes/billing.routes.js';
import { campaignRouter } from './routes/campaign.routes.js';
import { templateRouter } from './routes/template.routes.js';
import { trackOpen, trackClick } from './utils/email-campaign.js';
import { Unsubscribe } from './models/Unsubscribe.js';

app.use('/api/auth', authRouter);
app.use('/api/funnels', funnelRouter);
app.use('/api/publish', publishRouter);
app.use('/api/leads', leadRouter);
app.use('/api/billing', billingRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/templates', templateRouter);

// Public tracking endpoints
app.get('/api/track/open', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');

  try {
    await trackOpen(token);
    // Return 1x1 transparent GIF
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAPAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64'));
  } catch (err) {
    res.status(500).send('Error');
  }
});

app.get('/api/track/click', async (req, res) => {
  const { token, url } = req.query;
  if (!token || !url) return res.status(400).json({ error: 'Missing token or url' });

  try {
    await trackClick(token);
    res.redirect(302, decodeURIComponent(url));
  } catch (err) {
    res.redirect(302, decodeURIComponent(url));
  }
});

// Public unsubscribe endpoint
app.get('/api/unsubscribe', async (req, res) => {
  const { token, email } = req.query;

  if (token && email) {
    // Record unsubscribe using token as identifier (for tracking-based unsub)
    const existing = await Unsubscribe.findOne({ token });
    if (!existing) {
      await Unsubscribe.create({
        email,
        token,
        reason: 'clicked_unsubscribe',
      });
    }
    // Show confirmation page
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Unsubscribed</title></head>
      <body style="font-family: system-ui; padding: 40px; max-width: 500px; margin: auto; text-align: center;">
        <h1>You've been unsubscribed</h1>
        <p>You will no longer receive emails from us.</p>
      </body>
      </html>
    `);
  }

  // Fallback page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Unsubscribe</title></head>
    <body style="font-family: system-ui; padding: 40px; max-width: 500px; margin: auto;">
      <h1>Unsubscribe</h1>
      <p>You have been unsubscribed from our emails.</p>
    </body>
    </html>
  `);
});


app.get("/token", async (req, res) => {
  try {
    if (!process.env.SAFARICOM_CONSUMER_KEY || !process.env.SAFARICOM_CONSUMER_SECRET) {
      return res.status(500).json({ 
        error: "Missing MPESA credentials in .env",
        details: "Set SAFARICOM_CONSUMER_KEY and SAFARICOM_CONSUMER_SECRET"
      });
    }

    const auth = Buffer.from(
      `${process.env.SAFARICOM_CONSUMER_KEY}:${process.env.SAFARICOM_CONSUMER_SECRET}`
    ).toString("base64");

    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    return res.json(response.data);

  } catch (error) {
    console.error('Token generation error:', error.response?.status, error.response?.data || error.message);
    return res.status(500).json({
      error: "Failed to generate Daraja token",
      details: error.response?.data || error.message,
      statusCode: error.response?.status
    });
  }
});

//console.log("KEY:", process.env.SAFARICOM_CONSUMER_KEY);
//console.log("SECRET:", process.env.SAFARICOM_CONSUMER_SECRET);
// console.log("ACCESS TOKEN:", access_token);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;

// Validate critical environment variables on startup
const requiredEnvVars = [
  'SAFARICOM_CONSUMER_KEY',
  'SAFARICOM_CONSUMER_SECRET',
  'DARAJA_TILL_SHORTCODE',
  'DARAJA_PASSKEY',
  'PUBLIC_BASE_URL',
  'MONGODB_URI',
  'JWT_SECRET'
];

const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.warn('⚠️  Missing environment variables:', missing.join(', '));
}

// Warn about ngrok URL format
if (process.env.PUBLIC_BASE_URL?.includes('ngrok-free.dev')) {
  console.warn('⚠️  Ngrok URL detected - these expire after a few hours. Get a fresh ngrok URL at https://ngrok.com');
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Daraja token endpoint: http://localhost:${PORT}/token`);
})