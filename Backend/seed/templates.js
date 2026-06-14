import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmailTemplate } from '../models/EmailTemplate.js';

const _filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(_filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEFAULT_NOTIFICATION_TEMPLATE = {
  name: 'New Lead Notification',
  type: 'notification',
  subject: '🆕 New lead captured: {{lead}} from {{funnel}}',
  htmlBody: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Lead Notification</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="background-color: #4f46e5; padding: 24px 32px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                      🆕 New Lead Captured
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 16px; font-size: 16px; color: #1f2937; line-height: 1.6;">
                      <strong>Congratulations!</strong> A new lead has just been captured from your funnel.
                    </p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin: 20px 0;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280;">
                            <strong style="color: #374151;">Funnel:</strong> {{funnel}}
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #6b7280;">
                            <strong style="color: #374151;">Lead Email:</strong> {{lead}}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 24px 0 0; font-size: 16px; color: #1f2937; line-height: 1.6;">
                      <a href="{{funnelUrl}}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">
                        View all leads →
                      </a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                      This notification was sent from {{funnel}} funnel.
                      <br>
                      <em>You can manage email notifications in your funnel settings.</em>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  textBody: `New Lead Captured!

Congratulations! A new lead has just been captured from your funnel.

Funnel: {{funnel}}
Lead Email: {{lead}}

View all leads here: {{funnelUrl}}

---
This notification was sent from {{funnel}} funnel.
You can manage email notifications in your funnel settings.`,
};

const DEFAULT_AUTORESPONDER_TEMPLATE = {
  name: 'Thank You Autoresponder',
  type: 'autoresponder',
  subject: '{{name}}, your message has been received! Here\'s what\'s next...',
  htmlBody: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 32px 40px; text-align: center;">
                    <div style="background-color: rgba(255,255,255,0.2); width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 28px; font-weight: 700;">
                      Message Received!
                    </h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">
                      Hi {{name}}, thanks for contacting {{funnel}}
                    </p>
                  </td>
                </tr>

                <!-- Updates Bar -->
                <tr>
                  <td style="background-color: #ecfdf5; padding: 12px 32px; border-bottom: 1px solid #d1fae5;">
                    <p style="margin: 0; font-size: 14px; color: #065f46; display: flex; align-items: center; gap: 8px;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <strong>What's next:</strong> We typically respond within 24 hours
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 32px;">
                    <!-- Confirmation Box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 8px; font-size: 15px; color: #166534; font-weight: 600;">
                            We've received your message
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.6;">
                            One of our team members will review your inquiry and get back to you shortly. We take every message seriously.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- What to Expect -->
                    <h3 style="margin: 0 0 16px; font-size: 18px; color: #111827; font-weight: 600;">
                      What you can expect:
                    </h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="top" width="32" style="padding-bottom: 12px;">
                          <div style="background-color: #dbeafe; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 14px;">📅</span>
                          </div>
                        </td>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0 0 4px; font-size: 15px; color: #1f2937; font-weight: 500;">
                            Response Time
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
                            We aim to respond within <strong>24 hours</strong> during business days.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" width="32" style="padding-bottom: 12px;">
                          <div style="background-color: #fef3c7; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 14px;">📧</span>
                          </div>
                        </td>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0 0 4px; font-size: 15px; color: #1f2937; font-weight: 500;">
                            Reply to This Email
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
                            Simply reply to this message if you need to add any details.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" width="32">
                          <div style="background-color: #e0e7ff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 14px;">💬</span>
                          </div>
                        </td>
                        <td>
                          <p style="margin: 0 0 4px; font-size: 15px; color: #1f2937; font-weight: 500;">
                            Urgent Questions?
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
                            Reply to this email with "URGENT" in the subject and we'll prioritize it.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0 24px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
                            <tr>
                              <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 16px 40px;">
                                <a href="#" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                                  📬 View Your Message Details
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Fine Print -->
                    <p style="margin: 24px 0 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
                      This confirmation was sent to {{name}} at {{leadEmail}}.
                    </p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 32px;">
                    <div style="border-top: 1px solid #e5e7eb;"></div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; text-align: center; background-color: #f9fafb;">
                    <p style="margin: 0 0 12px; font-size: 14px; color: #4b5563; line-height: 1.5;">
                      {{funnel}} &copy; {{currentYear}}<br>
                      All rights reserved.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                      You received this email because you contacted {{funnel}}.<br>
                      <a href="{{unsubscribe_url}}" style="color: #10b981; text-decoration: underline;">Unsubscribe</a> from future confirmations
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  textBody: `Message Received, {{name}}!

Hi {{name}},

Thank you for reaching out to {{funnel}}! We've received your message and will respond within 24 hours during business days.

━━━━━━━━━━━━━━━━━━━━━━━━━
📋 WHAT TO EXPECT
━━━━━━━━━━━━━━━━━━━━━━━━━

Confirmed — We've received your inquiry

⏰ Response Time: Within 24 hours (business days)
💬 Questions? Simply reply to this email
🚨 Urgent? Add "URGENT" to the subject line

━━━━━━━━━━━━━━━━━━━━━━━━━
📧 NEED TO FOLLOW UP?
━━━━━━━━━━━━━━━━━━━━━━━━━

Just hit reply and we'll see your response. You can reference your inquiry ID: {{leadId}}.

━━━━━━━━━━━━━━━━━━━━━━━━━
📬 PREFERENCES
━━━━━━━━━━━━━━━━━━━━━━━━━

This confirmation was sent to {{leadEmail}}.

You received this email because you contacted {{funnel}}. 
Unsubscribe: {{unsubscribe_url}}

© {{currentYear}} {{funnel}} — All rights reserved.`,
};

async function seedTemplates() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get or create admin user to assign templates to
    // We need a user ID - let's find any user or create a system user
    const User = (await import('../models/User.js')).User;
    
    let adminUser = await User.findOne({ email: /@example\.com$/ }) || await User.findOne();
    
    if (!adminUser) {
      console.warn('No users found in database. Creating a default system user...');
      adminUser = await User.create({
        email: 'system@funnelbuilder.local',
        password: 'placeholder', // Won't be used
        name: 'System',
      });
      console.log('Created system user');
    }

    // Create/Update Notification Template
    let notifTemplate = await EmailTemplate.findOne({
      ownerId: adminUser._id,
      type: 'notification',
    });

    if (notifTemplate) {
      // Update existing template
      notifTemplate = await EmailTemplate.findOneAndUpdate(
        { _id: notifTemplate._id },
        {
          ...DEFAULT_NOTIFICATION_TEMPLATE,
          ownerId: adminUser._id,
        },
        { new: true }
      );
      console.log('Updated "New Lead Notification" email template');
    } else {
      notifTemplate = await EmailTemplate.create({
        ...DEFAULT_NOTIFICATION_TEMPLATE,
        ownerId: adminUser._id,
      });
      console.log('Created "New Lead Notification" email template');
    }

    // Create/Update Autoresponder Template
    let autoTemplate = await EmailTemplate.findOne({
      ownerId: adminUser._id,
      type: 'autoresponder',
    });

    if (autoTemplate) {
      // Update existing template
      autoTemplate = await EmailTemplate.findOneAndUpdate(
        { _id: autoTemplate._id },
        {
          ...DEFAULT_AUTORESPONDER_TEMPLATE,
          ownerId: adminUser._id,
        },
        { new: true }
      );
      console.log('Updated "Thank You Autoresponder" email template');
    } else {
      autoTemplate = await EmailTemplate.create({
        ...DEFAULT_AUTORESPONDER_TEMPLATE,
        ownerId: adminUser._id,
      });
      console.log('Created "Thank You Autoresponder" email template');
    }

    console.log('\n✨ Seed complete!');
    console.log('\n📋 Template IDs (copy these for reference):');
    console.log(`   Notification Template: ${notifTemplate._id}`);
    console.log(`   Autoresponder Template: ${autoTemplate._id}\n`);

    process.exit(0);
  } catch (err) {
    console.error(' Seed failed:', err);
    process.exit(1);
  }
}

seedTemplates();
