import { PostHog } from 'posthog-node';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.POSTHOG_API_KEY;
const host = process.env.POSTHOG_HOST;

let posthog = null;

if (apiKey) {
  const options = {};

  if (host) {
    options.host = host;
  }

  posthog = new PostHog(apiKey, options);
}

export function trackEvent(distinctId, event, properties) {
  if (!posthog || !distinctId || !event) return;

  try {
    posthog.capture({ distinctId, event, properties });
  } catch (err) {
    console.warn('PostHog capture failed:', err.message);
  }
}

export async function shutdownPostHog() {
  if (!posthog) return;

  try {
    await posthog.shutdown();
  } catch (err) {
    console.warn('PostHog shutdown failed:', err.message);
  }
}

export default posthog;
