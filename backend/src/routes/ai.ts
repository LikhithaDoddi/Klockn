import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { getDb } from '../db/client'
import { logger } from '../lib/logger'

export const aiRouter = Router()

aiRouter.use(requireAuth)

const chatSchema = z.object({
  groupId: z.string().uuid(),
  message: z.string().min(1).max(500),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).default([]),
})

aiRouter.post('/chat', validate(chatSchema), async (req, res) => {
  try {
    const { groupId, message, history } = req.body as {
      groupId: string
      message: string
      history: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    // Verify the group belongs to this organizer
    const organizer = await getDb()
      .selectFrom('organizers')
      .select('id')
      .where('firebase_uid', '=', req.user!.uid)
      .executeTakeFirst()

    if (!organizer) {
      return res.status(404).json({ success: false, error: 'User profile not found' })
    }

    const group = await getDb()
      .selectFrom('groups')
      .select(['id', 'name'])
      .where('id', '=', groupId)
      .where('organizer_id', '=', organizer.id)
      .executeTakeFirst()

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' })
    }

    // Fetch busy slots for this group to derive free windows
    const members = await getDb()
      .selectFrom('group_members')
      .select('id')
      .where('group_id', '=', groupId)
      .where('status', '=', 'calendar_connected')
      .execute()

    const now = new Date()
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const busySlots = members.length > 0
      ? await getDb()
          .selectFrom('group_busy_slots')
          .select(['member_id', 'starts_at', 'ends_at'])
          .where('member_id', 'in', members.map((m) => m.id))
          .where('starts_at', '>=', now)
          .where('starts_at', '<=', twoWeeksOut)
          .execute()
      : []

    // Derive simple free windows: hourly slots where all connected members are free
    const freeWindows: Array<{ start: string; end: string; label: string }> = []
    if (members.length > 0) {
      for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const dayStart = new Date(now)
        dayStart.setUTCHours(0, 0, 0, 0)
        dayStart.setUTCDate(dayStart.getUTCDate() + dayOffset)

        for (let hour = 9; hour <= 20; hour++) {
          const slotStart = new Date(dayStart)
          slotStart.setUTCHours(hour, 0, 0, 0)
          const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000)

          const allFree = members.every((m) =>
            !busySlots.some(
              (b) =>
                b.member_id === m.id &&
                new Date(b.starts_at) < slotEnd &&
                new Date(b.ends_at) > slotStart
            )
          )

          if (allFree) {
            freeWindows.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              label: slotStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
                ` ${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'}`,
            })
            if (freeWindows.length >= 5) break
          }
        }
        if (freeWindows.length >= 5) break
      }
    }

    // Forward to AI service
    const aiUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:5000'
    const aiRes = await fetch(`${aiUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.AI_SERVICE_SECRET ?? '',
      },
      body: JSON.stringify({ groupId, message, history, freeWindows }),
    })

    if (!aiRes.ok) {
      throw new Error(`AI service returned ${aiRes.status}`)
    }

    const aiData = await aiRes.json() as { success: boolean; data: { reply: string; suggestion: unknown } }
    return res.json({ success: true, data: aiData.data })
  } catch (err) {
    logger.error('AI chat failed', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'AI service unavailable' })
  }
})
