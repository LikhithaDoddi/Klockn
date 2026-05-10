import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { logger } from '../lib/logger'

let connection: IORedis | null = null

export function getRedis(): IORedis {
  if (!connection) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379'
    connection = new IORedis(url, { maxRetriesPerRequest: null })
    connection.on('error', (err) => logger.error('Redis error', { error: err.message }))
    connection.on('connect', () => logger.info('Redis connected'))
  }
  return connection
}

export const notificationQueue = new Queue('notifications', {
  connection: getRedis(),
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
})

export const inviteEmailQueue = new Queue('invite-emails', {
  connection: getRedis(),
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
})
