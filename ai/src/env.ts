// The AI service is internal-only, but it still needs its credentials present.
// A missing ANTHROPIC_API_KEY means chat/venues can't work; a missing
// AI_SERVICE_SECRET would leave the shared-secret gate effectively open. In
// production we refuse to start rather than run degraded or unauthenticated.
const REQUIRED = ['ANTHROPIC_API_KEY', 'AI_SERVICE_SECRET'] as const

export function validateEnv(): void {
  const missing = REQUIRED.filter((key) => !process.env[key])
  if (missing.length === 0) return

  const message = `Missing required environment variables: ${missing.join(', ')}`
  if (process.env.NODE_ENV === 'production') {
    process.stderr.write(`${message} — refusing to start\n`)
    process.exit(1)
  }
  process.stderr.write(`${message} — continuing in non-production mode\n`)
}
