import posthog, { posthogEnabled } from './posthog'

export function trackEvent(eventName, properties) {
  if (!posthogEnabled) return
  posthog.capture(eventName, properties)
}
