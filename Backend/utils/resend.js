import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, from, subject, html, text }) {
  const fromEmail = process.env.RESEND_FROM_EMAIL || from?.email || from;

  const fromObj = from?.name
    ? { email: fromEmail, name: from.name }
    : fromEmail;

  try {
    const result = await resend.emails.send({
      from: fromObj,
      to,
      subject,
      html,
      text: text || htmlToPlainText(html),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Resend send error:', error.message, error.code, error.status);
    throw error;
  }
}

function htmlToPlainText(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default { sendEmail };
