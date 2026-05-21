import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { logger } from '../lib/logger'

let connection: IORedis | null = null
let _notificationQueue: Queue | null = null
let _inviteEmailQueue: Queue | null = null

export function getRedis(): IORedis {
  if (!connection) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379'
    connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    })
    connection.on('error', (err) => logger.error('Redis error', { error: err.message }))
    connection.on('connect', () => logger.info('Redis connected'))
  }
  return connection
}

export function getNotificationQueue(): Queue {
  if (!_notificationQueue) {
    _notificationQueue = new Queue('notifications', {
      connection: getRedis(),
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    })
  }
  return _notificationQueue
}

export function getInviteEmailQueue(): Queue {
  if (!_inviteEmailQueue) {
    _inviteEmailQueue = new Queue('invite-emails', {
      connection: getRedis(),
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    })
  }
  return _inviteEmailQueue
}

// Keep named exports for backwards compat — these are just aliases
export const inviteEmailQueue = { add: (...args: Parameters<Queue['add']>) => getInviteEmailQueue().add(...args) }
export const notificationQueue = { add: (...args: Parameters<Queue['add']>) => getNotificationQueue().add(...args) }
