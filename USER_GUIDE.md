# Funnel Builder — User Guide

Build landing pages, capture leads, and send email campaigns.
**1 credit = KSh 15.** Credits cover emails sent, leads captured, and funnels published.

---

## 1. Getting Started

1. Create an account (free trial included) at the login page.
2. You start with trial credits. When the trial ends, top up with M-Pesa to keep going.
3. The **Dashboard** shows your wallet balance, trial expiry, and all your funnels.

---

## 2. Creating a Funnel

A funnel is a single landing page with a unique public URL.

1. Click **New** on the Dashboard.
2. Enter a **Name** (e.g. "Summer Sale") and a **Slug** (e.g. `summer-sale`).
   - The slug becomes your public URL: `/p/summer-sale`.
   - Use lowercase letters, numbers, and hyphens only.
3. Click **Create**. You are taken to the Funnel Editor.

### Funnel Editor

- **Add section**: choose Heading, Text, Button, or Lead form.
- Click any block to edit its text/properties inline in the preview.
- **Save** frequently (auto-save is off — save manually).
- **Publish**: copies the funnel to a public URL and copies the link to your clipboard.
- **Delete**: removes the funnel and all its leads/campaigns permanently.

---

## 3. Lead Capture

Add a **Lead form** block to your funnel. When published:

- Visitors fill in their email (required), name, and phone.
- The lead is saved to your account.
- If you enabled **owner notification**, you get an email about the new lead.
- If you enabled **autoresponder**, the lead gets a thank-you email.

### Email Notifications (per funnel)

- **Notify me when a lead is captured**: sends an email to you (the owner) using a notification template.
- **Send autoresponder to lead**: sends a reply email to the lead using an autoresponder template.
- You can create default templates automatically, or pick/create custom ones in **Email Templates**.

---

## 4. Email Templates

Templates are reusable email bodies with personalization variables.

**Variables available:**
- `{{name}}`, `{{email}}` — the lead's details
- `{{lead.firstName}}`, `{{lead.lastName}}`, `{{lead.email}}`
- `{{funnel.name}}` — the funnel name
- `{{appUrl}}` — link to your dashboard
- `{{unsubscribe_url}}` — one-click unsubscribe link

**Template types:**
- **Notification** — emails sent to you when a lead is captured.
- **Autoresponder** — emails sent to the lead after they submit.

You can create, edit, and delete templates from the **Email Templates** page.

---

## 5. Email Campaigns

Campaigns send one email to many leads at once.

1. Go to **Email Marketing → All Campaigns → New**.
2. Fill in:
   - **Name** (internal reference)
   - **Subject** (email subject line)
   - **Text Body** (supports `{{name}}` and `{{email}}` personalization)
   - **Target Funnel** (optional — send only to leads from one funnel; leave blank for all leads)
3. Click **Create Campaign**.
4. On the campaign detail page you can **Send** to all recipients.
5. Track results: sent count, delivered count, open rate, and click rate.

> Note: Sending emails consumes credits (1 credit per email).

---

## 6. Billing & Credits

### Credits
- **1 credit = KSh 15**
- 1 credit covers: 1 email sent, 1 lead captured, or 1 funnel published.

### Top Up (M-Pesa)
1. Go to **Top up with M-Pesa**.
2. Choose a preset package or type any amount (it snaps to the nearest KSh 15).
3. Enter your phone number (2547... format).
4. Click **Send STK**. You'll receive an M-Pesa prompt on your phone.
5. After payment, credits are added to your wallet automatically.

### Trial
- New accounts start with a free trial. The trial end date is shown on the Dashboard.
- After the trial, top up to continue using the platform.

---

## 7. Public Funnel URL

Once published, your funnel is live at:
```
https://<your-domain>/p/<slug>
```
Share this link anywhere — social media, ads, email signature.

---

## 8. Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't log in | Check your email/password. Use "Continue with Google" if you signed up that way. |
| M-Pesa STK not received | Verify your phone number starts with 254. Check your M-Pesa balance and messages. |
| Funnel not publishing | Ensure you clicked **Publish** and have at least 1 credit. |
| Email not sending | Check that templates are configured and you have credits. |
| Lead not captured | Confirm the funnel is published and the form is filled correctly. |

---

## Need Help?

For support, contact the platform administrator.