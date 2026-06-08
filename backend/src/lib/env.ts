import { logger } from './logger'

// Variables the backend cannot serve real traffic without. In production a
// missing one guarantees failure, so we refuse to start (fail fast) rather than
// boot into a broken state and surface confusing errors on the first request.
const REQUIRED = [
  'DATABASE_URL',
  'ENCRYPTION_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
] as const

// Variables that disable a feature when absent but don't stop the server.
const RECOMMENDED = [
  'REDIS_URL',
  'RESEND_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'AI_SERVICE_URL',
  'AI_SERVICE_SECRET',
] as const

function failFast(message: string): void {
  if (process.env.NODE_ENV === 'production') {
    logger.error(`${message} — refusing to start`)
    process.exit(1)
  }
  logger.warn(`${message} — continuing in non-production mode; related features will fail`)
}

export function validateEnv(): void {
  const degraded = RECOMMENDED.filter((key) => !process.env[key])
  if (degraded.length > 0) {
    logger.warn(`Optional env vars missing — related features disabled: ${degraded.join(', ')}`)
  }

  // A wrong-length key makes every encrypt()/decrypt() call throw at runtime;
  // catch it at boot instead of when the first calendar token is stored.
  const key = process.env.ENCRYPTION_KEY
  if (key && Buffer.from(key, 'hex').length !== 32) {
    failFast('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }

  const missing = REQUIRED.filter((key) => !process.env[key])
  if (missing.length > 0) {
    failFast(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
