import posthog from 'posthog-js'

const projectKey = import.meta.env.VITE_POSTHOG_PROJECT_KEY
const apiHost = import.meta.env.VITE_POSTHOG_HOST

let initialized = false

if (projectKey) {
  const config = {
    autocapture: true,
    capture_pageview: 'history_change',
  }

  if (apiHost) {
    config.api_host = apiHost
  }

  try {
    posthog.init(projectKey, config)
    initialized = true
  } catch (err) {
    console.warn('PostHog init failed:', err.message)
  }
}

export const posthogEnabled = initialized
export default posthog
