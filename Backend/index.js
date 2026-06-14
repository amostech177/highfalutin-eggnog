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
import { sendEmail } from './utils/resend.js';

const mongoUri = process.env.MONGODB_URI;
const safeMongoUri = mongoUri
  ? mongoUri.replace(/:\/\/([^:]+):([^@]+)@/, (_, user, pass) => `://${user}:${encodeURIComponent(pass)}@`)
  : mongoUri;

const app = express();
app.use(express.json());

mongoose.connect(safeMongoUri, {
  family: 4,
  serverSelectionTimeoutMS: 15000,
}).then(() => {
  console.log('Connected to MongoDB!');
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Daraja token endpoint: http://localhost:${PORT}/token`);
  });
}).catch((err) => {
  console.error('MongoDB connection error:', err.message);
  console.error('Server will NOT start until MongoDB is reachable.');
  process.exit(1);
});
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()).filter(Boolean) ?? '*',
  credentials: true,
}));

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/test-email', async (req, res) => {
  await sendEmail({
    to: "delivered@resend.dev",
    subject: "Test",
    html: "<h1>Hello</h1>"
  });
  res.send("Email sent");
});

app.get('/test-personalization', async (req, res) => {
  const { name = "John", email = "test@example.com" } = req.query;

  // Simulate template substitution
  let template = "Hi {{name}}, your email is {{email}}";
  template = template.replaceAll('{{name}}', name).replaceAll('{{email}}', email);

  res.json({ success: true, template });
});

app.get('/test-tracking', (req, res) => {
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  res.json({
    openTrackUrl: `${baseUrl}/api/track/open?token=abc123`,
    clickTrackUrl: `${baseUrl}/api/track/click?token=xyz789&url=https://example.com`,
    unsubscribeUrl: `${baseUrl}/api/unsubscribe?token=xyz789&email=test%40example.com`,
    note: "Open URL returns a 1x1 pixel; Click URL redirects; Unsubscribe records opt-out"
  });
});

app.get('/test-simulate-tracking', async (req, res) => {
  const { recipientId, type } = req.query;
  if (!recipientId || !type) return res.status(400).json({ error: 'Missing recipientId or type' });

  const { CampaignRecipient } = await import('./models/CampaignRecipient.js');
  const recipient = await CampaignRecipient.findById(recipientId);
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

  if (type === 'open') {
    recipient.openedAt = new Date();
    recipient.status = 'opened';
    await recipient.save();
    // Update campaign open count
    const { Campaign } = await import('./models/Campaign.js');
    await Campaign.updateOne({ _id: recipient.campaignId }, { $inc: { openCount: 1 } });
    res.json({ success: true, message: 'Open tracked' });
  } else if (type === 'click') {
    recipient.clickedAt = new Date();
    recipient.status = 'clicked';
    await recipient.save();
    const { Campaign } = await import('./models/Campaign.js');
    await Campaign.updateOne({ _id: recipient.campaignId }, { $inc: { clickCount: 1 } });
    res.json({ success: true, message: 'Click tracked' });
  } else {
    res.status(400).json({ error: 'Invalid type (use "open" or "click")' });
  }
});

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
  console.warn('Missing environment variables:', missing.join(', '));
}

// Warn about ngrok URL format
if (process.env.PUBLIC_BASE_URL?.includes('ngrok-free.dev')) {
  console.warn('Ngrok URL detected - these expire after a few hours. Get a fresh ngrok URL at https://ngrok.com');
}