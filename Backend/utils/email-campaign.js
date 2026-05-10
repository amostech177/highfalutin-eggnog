import { Campaign } from '../models/Campaign.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { Lead } from '../models/Lead.js';
import { Unsubscribe } from '../models/Unsubscribe.js';
import { ensureCanConsume, debitWallet, incrementUsage } from '../utils/billing.js';
import resend from '../utils/resend.js';
import { randomBytes } from 'crypto';

// Simple template substitution for personalization
function substituteTemplate(template, data) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{{${key}}}`, String(value));
  }
  return result;
}

function generateToken() {
  return randomBytes(16).toString('hex');
}

export async function sendCampaign(campaignId) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  // Build lead query
  const leadQuery = { ownerId: campaign.ownerId };

  if (campaign.funnelId) {
    leadQuery.funnelId = campaign.funnelId;
  }

  if (campaign.leadFilter && campaign.leadFilter.pageId) {
    leadQuery.pageId = campaign.leadFilter.pageId;
  }

  // Find all leads
  const leads = await Lead.find(leadQuery).select('email name funnelId');
  
  // Deduct credits for all recipients
  const totalRecipients = leads.length;
  const gate = await ensureCanConsume(campaign.ownerId.toString(), 'emails', totalRecipients);
  if (!gate.ok) {
    throw new Error(gate.message);
  }

  let processedCount = 0;
  let failedCount = 0;

    for (const lead of leads) {
     // Check if unsubscribed
     const unsub = await Unsubscribe.findOne({ email: lead.email });
     if (unsub) {
       failedCount++;
       continue;
     }

     // Personalization context
     const context = {
       name: lead.name || '',
       email: lead.email
     };

     // Personalize the textBody
     let personalizedText = substituteTemplate(campaign.textBody, context);

     // Create recipient record
     const openToken = generateToken();
     const clickToken = generateToken();
     
     const recipient = await CampaignRecipient.create({
       campaignId: campaign._id,
       leadId: lead._id,
       recipientEmail: lead.email,
       recipientName: lead.name || '',
       funnelId: lead.funnelId,
       status: 'pending',
       openToken,
       clickToken,
     });

     try {
        // Build tracking URLs
        const openTrackUrl = `${process.env.PUBLIC_BASE_URL}/api/track/open?token=${openToken}`;
        const clickTrackUrl = `${process.env.PUBLIC_BASE_URL}/api/track/click?token=${clickToken}&url=`;
        const unsubscribeUrl = `${process.env.PUBLIC_BASE_URL}/api/unsubscribe?token=${clickToken}&email=${encodeURIComponent(lead.email)}`;

        // Convert personalizedText to basic HTML with tracking
        let htmlWithTracking = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${personalizedText.replace(/\n/g, '<br/>')}</div>`;
        
        // Inject open tracking into </body> (or append if no </body>)
        if (/<\/body>/i.test(htmlWithTracking)) {
          htmlWithTracking = htmlWithTracking.replace(/<\/body>/i, `<img src="${openTrackUrl}" width="1" height="1" style="display:none" alt="" /></body>`);
        } else {
          htmlWithTracking += `<img src="${openTrackUrl}" width="1" height="1" style="display:none" alt="" />`;
        }

        // Replace links with click tracking (only for actual HTML content)
        htmlWithTracking = htmlWithTracking.replace(/href=["']([^"']+)["']/g, (match, url) => {
          if (url.includes('mailto:') || url.includes('#')) return match;
          return `href="${clickTrackUrl}${encodeURIComponent(url)}"`;
        });

        // Append unsubscribe footer before </body> or at end
        const unsubscribeHtml = `<hr style="margin-top:24px;border:none;border-top:1px solid #eee"/><p style="font-size:12px;color:#666">
          <a href="${unsubscribeUrl}">Unsubscribe</a> from our emails.
        </p>`;
        if (/<\/body>/i.test(htmlWithTracking)) {
          htmlWithTracking = htmlWithTracking.replace(/<\/body>/i, `${unsubscribeHtml}</body>`);
        } else {
          htmlWithTracking += unsubscribeHtml;
        }

        // Send email
        const fromEmail = process.env.RESEND_FROM_EMAIL;
        const fromName = process.env.RESEND_FROM_NAME;

        await resend.sendEmail({
          to: lead.email,
          from: fromName ? { email: fromEmail, name: fromName } : fromEmail,
          subject: campaign.subject,
          html: htmlWithTracking,
          text: personalizedText,
        });

        // Mark as sent
        recipient.status = 'sent';
        recipient.sentAt = new Date();
        await recipient.save();

        processedCount++;
      } catch (err) {
        console.error(`Failed to send to ${lead.email}:`, err.message);
        recipient.status = 'bounced';
        recipient.error = err.message;
        await recipient.save();
        failedCount++;
      }
    }

  // Update campaign stats
  campaign.sentCount = processedCount;
  campaign.deliveredCount = processedCount - failedCount;
  
  if (gate.mode === 'wallet') {
    await debitWallet({
      userId: campaign.ownerId.toString(),
      amount: totalRecipients,
      reason: 'campaign_send',
      reference: `campaign:${campaign._id}`,
      meta: { campaignId: campaign._id.toString(), totalRecipients }
    });
  } else {
    await incrementUsage(campaign.ownerId.toString(), 'emails', totalRecipients);
  }

  campaign.status = 'sent';
  await campaign.save();

  return { processedCount, failedCount };
}

export async function trackOpen(token) {
  const recipient = await CampaignRecipient.findOne({ openToken: token });
  if (recipient && !recipient.openedAt) {
    recipient.openedAt = new Date();
    recipient.status = 'opened';
    await recipient.save();

    // Update campaign open count
    await Campaign.updateOne({ _id: recipient.campaignId }, { $inc: { openCount: 1 } });
  }
}

export async function trackClick(token) {
  const recipient = await CampaignRecipient.findOne({ clickToken: token });
  if (recipient && !recipient.clickedAt) {
    recipient.clickedAt = new Date();
    recipient.status = 'clicked';
    await recipient.save();

    // Update campaign click count
    await Campaign.updateOne({ _id: recipient.campaignId }, { $inc: { clickCount: 1 } });
  }
}
