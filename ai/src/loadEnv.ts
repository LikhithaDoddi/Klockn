// Load a local .env file in development. In production the platform
// (AWS ECS / Secrets Manager) injects environment variables directly and the
// `dotenv` package is not installed in the container image — so this must never
// throw when dotenv is absent. Imported first in index.ts so variables are set
// before any module reads process.env.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config()
} catch {
  // dotenv is a dev-only convenience; ignore when it isn't installed
}

export {}
