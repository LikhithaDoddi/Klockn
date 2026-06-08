import * as Sentry from '@sentry/react-native'

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN

// Initialize crash + error reporting. Always calls Sentry.init so that
// Sentry.wrap() has a valid client (avoids the "wrap before init" warning), but
// reporting is disabled when no DSN is configured (local dev / Expo Go). Call
// once at the top of the root layout module, before Sentry.wrap.
export function initSentry(): void {
  Sentry.init({
    dsn: dsn || undefined,
    enabled: Boolean(dsn),
    // Conservative defaults — full error capture, light performance sampling.
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
  })
}

export { Sentry }
