import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { getDb } from '../db/client'
import { logger } from '../lib/logger'

export const aiRouter = Router()

aiRouter.use(requireAuth)

const chatSchema = z.object({
  groupId: z.string().uuid().optional(),
  message: z.string().min(1).max(500),
  timezone: z.string().default('UTC'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).default([]),
})

aiRouter.post('/chat', validate(chatSchema), async (req, res) => {
  try {
    const { groupId, message, history, timezone } = req.body as {
      groupId?: string
      message: string
      timezone: string
      history: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    const organizer = await getDb()
      .selectFrom('organizers')
      .select(['id', 'email'])
      .where('firebase_uid', '=', req.user!.uid)
      .executeTakeFirst()

    if (!organizer) {
      return res.status(404).json({ success: false, error: 'User profile not found' })
    }

    let members: Array<{ id: string }> = []

    if (groupId) {
      // Allow access if user is organizer OR a member of the group
      const group = await getDb()
        .selectFrom('groups')
        .leftJoin('group_members as my_membership', (join) =>
          join.onRef('my_membership.group_id', '=', 'groups.id')
            .on('my_membership.email', '=', organizer.email)
        )
        .select(['groups.id', 'groups.name'])
        .where('groups.id', '=', groupId)
        .where((eb) =>
          eb.or([
            eb('groups.organizer_id', '=', organizer.id),
            eb('my_membership.id', 'is not', null),
          ])
        )
        .executeTakeFirst()

      if (!group) {
        return res.status(404).json({ success: false, error: 'Group not found' })
      }

      members = await getDb()
        .selectFrom('group_members')
        .select('id')
        .where('group_id', '=', groupId)
        .where('status', '=', 'calendar_connected')
        .execute()
    }

    const now = new Date()
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const busySlots = members.length > 0
      ? await getDb()
          .selectFrom('group_busy_slots')
          .select(['member_id', 'starts_at', 'ends_at'])
          .where('member_id', 'in', members.map((m) => m.id))
          .where('starts_at', '<=', twoWeeksOut)
          .where('ends_at', '>=', now)
          .execute()
      : []

    // Convert UTC date to local hour in the user's timezone
    function toLocalHour(utcDate: Date): number {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit', hour12: false,
      }).formatToParts(utcDate)
      return Number(parts.find(p => p.type === 'hour')?.value ?? '0') % 24
    }

    function toLocalDayLabel(utcDate: Date): string {
      return utcDate.toLocaleDateString('en-US', {
        timeZone: timezone,
        weekday: 'short', month: 'short', day: 'numeric',
      })
    }

    function toLocalTimeLabel(utcDate: Date): string {
      return utcDate.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    }

    // Walk UTC hours, identify slots that fall in local 9am-8pm and where all members are free
    const freeWindows: Array<{ start: string; end: string; label: string }> = []
    const cursor = new Date(now)
    cursor.setUTCMinutes(0, 0, 0)

    while (cursor < twoWeeksOut && freeWindows.length < 8) {
      const localHour = toLocalHour(cursor)
      if (localHour >= 9 && localHour < 20) {
        const slotEnd = new Date(cursor.getTime() + 60 * 60 * 1000)
        const allFree = members.length === 0 || members.every((m) =>
          !busySlots.some(
            (b) =>
              b.member_id === m.id &&
              new Date(b.starts_at) < slotEnd &&
              new Date(b.ends_at) > cursor
          )
        )
        if (allFree) {
          freeWindows.push({
            start: cursor.toISOString(),
            end: slotEnd.toISOString(),
            label: `${toLocalDayLabel(cursor)} ${toLocalTimeLabel(cursor)}`,
          })
        }
      }
      cursor.setUTCHours(cursor.getUTCHours() + 1)
    }

    // Forward to AI service
    const aiUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:5000'
    const aiRes = await fetch(`${aiUrl}/chat`, {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.AI_SERVICE_SECRET ?? '',
      },
      body: JSON.stringify({ groupId, message, history, freeWindows }),
    })

    if (!aiRes.ok) {
      throw new Error(`AI service returned ${aiRes.status}`)
    }

    const aiData = await aiRes.json() as {
      success: boolean
      data: {
        reply: string
        suggestion: {
          title?: string
          description?: string
          windowStart?: string
          windowEnd?: string
          label?: string
        } | null
      }
    }

    // Normalize suggestion to the shape the frontend expects
    const raw = aiData.data.suggestion
    const suggestion = raw ? {
      title: raw.title ?? '',
      datetime: raw.label ?? (raw.windowStart ? toLocalDayLabel(new Date(raw.windowStart)) + ' ' + toLocalTimeLabel(new Date(raw.windowStart)) : ''),
      duration: raw.windowStart && raw.windowEnd
        ? (() => {
            const mins = Math.round((new Date(raw.windowEnd).getTime() - new Date(raw.windowStart).getTime()) / 60000)
            return mins >= 60 ? `${mins / 60}h` : `${mins} min`
          })()
        : undefined,
      notes: raw.description,
    } : null

    return res.json({ success: true, data: { reply: aiData.data.reply, suggestion } })
  } catch (err) {
    logger.error('AI chat failed', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'AI service unavailable' })
  }
})
