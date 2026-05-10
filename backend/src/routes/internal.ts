import { Router } from 'express'
import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { validate } from '../middleware/validate'
import { getDb } from '../db/client'
import { notificationQueue } from '../jobs/queues'
import { logger } from '../lib/logger'

export const internalRouter = Router()

function requireInternalSecret(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers['x-internal-secret']
  if (!secret || secret !== process.env.AI_SERVICE_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  next()
}

const notifyGroupSchema = z.object({
  groupId: z.string().uuid(),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  message: z.string().min(1).max(500),
})

internalRouter.post(
  '/notify-group',
  requireInternalSecret,
  validate(notifyGroupSchema),
  async (req, res) => {
    try {
      const { groupId, windowStart, windowEnd, message } = req.body as {
        groupId: string
        windowStart: string
        windowEnd: string
        message: string
      }

      const group = await getDb()
        .selectFrom('groups')
        .select(['id', 'name', 'organizer_id'])
        .where('id', '=', groupId)
        .executeTakeFirst()

      if (!group) {
        return res.status(404).json({ success: false, error: 'Group not found' })
      }

      const organizer = await getDb()
        .selectFrom('organizers')
        .select(['push_token'])
        .where('id', '=', group.organizer_id)
        .executeTakeFirst()

      if (organizer?.push_token) {
        await notificationQueue.add('notify-organizer', {
          pushToken: organizer.push_token,
          title: `Everyone in "${group.name}" is free`,
          body: message,
        })
      }

      logger.info('Notify-group job queued', { groupId, windowStart, windowEnd })

      return res.json({ success: true, data: { queued: true } })
    } catch (err) {
      logger.error('Failed to queue group notification', { error: err instanceof Error ? err.message : String(err) })
      return res.status(500).json({ success: false, error: 'Failed to queue notification' })
    }
  },
)
