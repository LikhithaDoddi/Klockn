import { Worker } from 'bullmq'
import { logger } from '../lib/logger'
import { sendInviteEmail } from '../lib/email'

export interface NotificationJob {
  pushToken: string
  title: string
  body: string
}

export interface InviteEmailJob {
  email: string
  groupName: string
  inviteToken: string
}

function getRedisConnection() {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379')
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  }
}

async function sendExpoPush(job: NotificationJob): Promise<void> {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: job.pushToken,
      title: job.title,
      body: job.body,
      sound: 'default',
    }),
  })

  if (!res.ok) {
    throw new Error(`Expo push failed: ${res.status}`)
  }
}

export function startWorkers(): void {
  const connection = getRedisConnection()

  const notificationWorker = new Worker(
    'notifications',
    async (job) => {
      const data = job.data as NotificationJob
      await sendExpoPush(data)
      logger.info('Push notification sent', { token: data.pushToken.slice(0, 20) })
    },
    { connection },
  )

  const inviteEmailWorker = new Worker(
    'invite-emails',
    async (job) => {
      const data = job.data as InviteEmailJob
      await sendInviteEmail({
        to: data.email,
        groupName: data.groupName,
        inviteToken: data.inviteToken,
      })
    },
    { connection },
  )

  notificationWorker.on('failed', (job, err) => {
    logger.error('Notification job failed', { jobId: job?.id, error: err.message })
  })

  inviteEmailWorker.on('failed', (job, err) => {
    logger.error('Invite email job failed', { jobId: job?.id, error: err.message })
  })

  logger.info('BullMQ workers started')
}
