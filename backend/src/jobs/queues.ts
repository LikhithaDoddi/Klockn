import { Queue } from 'bullmq'
import { logger } from '../lib/logger'

let _notificationQueue: Queue | null = null
let _inviteEmailQueue: Queue | null = null

function getRedisConnection() {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379')
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  }
}

export function getNotificationQueue(): Queue {
  if (!_notificationQueue) {
    _notificationQueue = new Queue('notifications', {
      connection: getRedisConnection(),
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    })
    _notificationQueue.on('error', (err) => logger.error('Notification queue error', { error: err.message }))
  }
  return _notificationQueue
}

export function getInviteEmailQueue(): Queue {
  if (!_inviteEmailQueue) {
    _inviteEmailQueue = new Queue('invite-emails', {
      connection: getRedisConnection(),
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    })
    _inviteEmailQueue.on('error', (err) => logger.error('Invite email queue error', { error: err.message }))
  }
  return _inviteEmailQueue
}

export const inviteEmailQueue = { add: (...args: Parameters<Queue['add']>) => getInviteEmailQueue().add(...args) }
export const notificationQueue = { add: (...args: Parameters<Queue['add']>) => getNotificationQueue().add(...args) }
