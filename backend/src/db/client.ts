import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { logger } from '../lib/logger'
import type { Database } from './types'

let db: Kysely<Database>

export function initDb(): void {
  const { DATABASE_URL } = process.env

  if (!DATABASE_URL) {
    logger.warn('DATABASE_URL missing — database queries will fail until configured')
    return
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  })

  pool.on('error', (err) => {
    logger.error('Unexpected DB pool error', { error: err.message })
  })

  db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) })
  logger.info('Database pool initialized')
}

export function getDb(): Kysely<Database> {
  if (!db) {
    throw new Error('Database not initialized — call initDb() on startup')
  }
  return db
}
