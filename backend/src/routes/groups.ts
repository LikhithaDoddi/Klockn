import { Router } from 'express'
import { z } from 'zod'
import { google } from 'googleapis'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { getDb } from '../db/client'
import { inviteEmailQueue } from '../jobs/queues'
import { logger } from '../lib/logger'

export const groupsRouter = Router()

// ── Public routes (no auth) ──────────────────────────────────────────────────

groupsRouter.get('/:id/preview', async (req, res) => {
  try {
    const row = await getDb()
      .selectFrom('groups')
      .innerJoin('organizers', 'organizers.id', 'groups.organizer_id')
      .leftJoin('group_members', 'group_members.group_id', 'groups.id')
      .select([
        'groups.id',
        'groups.name',
        'organizers.name as organizerName',
        'organizers.email as organizerEmail',
        getDb().fn.count<string>('group_members.id').as('member_count'),
      ])
      .where('groups.id', '=', req.params.id)
      .groupBy(['groups.id', 'groups.name', 'organizers.name', 'organizers.email'])
      .executeTakeFirst()

    if (!row) {
      return res.status(404).json({ success: false, error: 'Group not found' })
    }

    return res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        createdBy: row.organizerName ?? row.organizerEmail ?? 'Someone',
        memberCount: Number(row.member_count),
      },
    })
  } catch (err) {
    logger.error('Failed to load group preview', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to load group' })
  }
})

groupsRouter.get('/:id/join-link', async (req, res) => {
  try {
    const group = await getDb()
      .selectFrom('groups')
      .select('id')
      .where('id', '=', req.params.id)
      .executeTakeFirst()

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4000/api/v1/calendar/google/callback'
    )

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state: Buffer.from(`join-group-web:${group.id}`).toString('base64'),
    })

    return res.json({ success: true, data: { url } })
  } catch (err) {
    logger.error('Failed to generate group join link', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to generate join link' })
  }
})

groupsRouter.get('/:id/availability', async (req, res) => {
  try {
    const group = await getDb()
      .selectFrom('groups')
      .select(['id', 'name'])
      .where('id', '=', req.params.id)
      .executeTakeFirst()

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' })
    }

    const members = await getDb()
      .selectFrom('group_members')
      .select(['id', 'status'])
      .where('group_id', '=', group.id)
      .execute()

    const weekStartParam = typeof req.query.weekStart === 'string' ? req.query.weekStart : null
    const weekStart = weekStartParam && /^\d{4}-\d{2}-\d{2}$/.test(weekStartParam)
      ? weekStartParam
      : (() => {
          const now = new Date()
          now.setUTCDate(now.getUTCDate() - now.getUTCDay())
          return now.toISOString().slice(0, 10)
        })()

    const rangeStart = new Date(`${weekStart}T00:00:00Z`)
    const rangeEnd = new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    const connectedMembers = members.filter((m) => m.status === 'calendar_connected')
    const memberIds = connectedMembers.map((m) => m.id)
    const busySlots = memberIds.length > 0
      ? await getDb()
          .selectFrom('group_busy_slots')
          .select(['member_id', 'starts_at', 'ends_at'])
          .where('member_id', 'in', memberIds)
          .where('starts_at', '<', rangeEnd)
          .where('ends_at', '>', rangeStart)
          .execute()
      : []

    function computeAvailability(memberId: string) {
      const memberBusy = busySlots.filter((s) => s.member_id === memberId)
      const slots: { date: string; hour: number; free: boolean }[] = []
      for (let day = 0; day < 7; day++) {
        const dayStart = new Date(rangeStart.getTime() + day * 24 * 60 * 60 * 1000)
        const dateStr = dayStart.toISOString().slice(0, 10)
        for (let hour = 7; hour <= 20; hour++) {
          const slotStart = new Date(dayStart)
          slotStart.setUTCHours(hour, 0, 0, 0)
          const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000)
          const isBusy = memberBusy.some(
            (b) => new Date(b.starts_at) < slotEnd && new Date(b.ends_at) > slotStart
          )
          slots.push({ date: dateStr, hour, free: !isBusy })
        }
      }
      return slots
    }

    return res.json({
      success: true,
      data: {
        groupName: group.name,
        memberCount: members.length,
        availability: connectedMembers.map((m) => ({
          id: m.id,
          availability: computeAvailability(m.id),
        })),
      },
    })
  } catch (err) {
    logger.error('Failed to load group availability', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to load availability' })
  }
})

// ── Auth-required routes ─────────────────────────────────────────────────────

groupsRouter.use(requireAuth)

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
})

const inviteMembersSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(500),
})

groupsRouter.post('/', validate(createGroupSchema), async (req, res) => {
  try {
    const organizer = await getDb()
      .selectFrom('organizers')
      .select('id')
      .where('firebase_uid', '=', req.user!.uid)
      .executeTakeFirst()

    if (!organizer) {
      return res.status(404).json({ success: false, error: 'User profile not found' })
    }

    const group = await getDb()
      .insertInto('groups')
      .values({ organizer_id: organizer.id, name: req.body.name })
      .returningAll()
      .executeTakeFirstOrThrow()

    return res.status(201).json({
      success: true,
      data: { id: group.id, name: group.name, createdAt: group.created_at },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to create group' })
  }
})

groupsRouter.get('/', async (req, res) => {
  try {
    const organizer = await getDb()
      .selectFrom('organizers')
      .select('id')
      .where('firebase_uid', '=', req.user!.uid)
      .executeTakeFirst()

    if (!organizer) {
      return res.status(404).json({ success: false, error: 'User profile not found' })
    }

    const groups = await getDb()
      .selectFrom('groups')
      .leftJoin('group_members', 'group_members.group_id', 'groups.id')
      .select([
        'groups.id',
        'groups.name',
        'groups.created_at',
        getDb().fn.count<string>('group_members.id').as('member_count'),
      ])
      .where('groups.organizer_id', '=', organizer.id)
      .groupBy('groups.id')
      .orderBy('groups.created_at', 'desc')
      .execute()

    return res.json({
      success: true,
      data: groups.map(g => ({
        id: g.id,
        name: g.name,
        memberCount: Number(g.member_count),
        createdAt: g.created_at,
      })),
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch groups' })
  }
})

groupsRouter.get('/:id', async (req, res) => {
  try {
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
      .selectAll()
      .where('id', '=', req.params.id)
      .where('organizer_id', '=', organizer.id)
      .executeTakeFirst()

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' })
    }

    const members = await getDb()
      .selectFrom('group_members')
      .select(['id', 'email', 'name', 'status', 'invited_at'])
      .where('group_id', '=', group.id)
      .execute()

    // Compute hourly availability per member from their stored busy slots
    const weekStartParam = typeof req.query.weekStart === 'string' ? req.query.weekStart : null
    const weekStart = weekStartParam && /^\d{4}-\d{2}-\d{2}$/.test(weekStartParam)
      ? weekStartParam
      : (() => {
          const now = new Date()
          now.setUTCDate(now.getUTCDate() - now.getUTCDay())
          return now.toISOString().slice(0, 10)
        })()

    const tz = typeof req.query.timezone === 'string' ? req.query.timezone : 'UTC'

    // Expand range by ±1 day so timezone offsets don't clip events near day boundaries
    const rangeStart = new Date(`${weekStart}T00:00:00Z`)
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 1)
    const rangeEnd = new Date(`${weekStart}T00:00:00Z`)
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 8)

    const memberIds = members.map((m) => m.id)
    const busySlots = memberIds.length > 0
      ? await getDb()
          .selectFrom('group_busy_slots')
          .select(['member_id', 'starts_at', 'ends_at'])
          .where('member_id', 'in', memberIds)
          .where('starts_at', '<', rangeEnd)
          .where('ends_at', '>', rangeStart)
          .execute()
      : []

    // Convert a UTC Date to the local date+hour in the viewer's timezone
    function toLocalHour(utcDate: Date): { date: string; hour: number } {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', hour12: false,
      }).formatToParts(utcDate)
      const get = (t: string) => parts.find(p => p.type === t)?.value ?? '0'
      return {
        date: `${get('year')}-${get('month')}-${get('day')}`,
        hour: Number(get('hour')) % 24,
      }
    }

    // The 7 local dates for this week (weekStart is already a local date from the frontend)
    const localDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${weekStart}T12:00:00Z`)
      d.setUTCDate(d.getUTCDate() + i)
      return d.toISOString().slice(0, 10)
    })

    function computeAvailability(memberId: string) {
      const memberBusy = busySlots.filter((s) => s.member_id === memberId)

      // Walk each UTC busy slot hour-by-hour and mark local hours as busy
      const busyHours = new Set<string>()
      for (const slot of memberBusy) {
        const start = new Date(slot.starts_at)
        const end = new Date(slot.ends_at)
        // Snap to the UTC hour containing start
        const cur = new Date(start)
        cur.setUTCMinutes(0, 0, 0)
        while (cur < end) {
          const { date, hour } = toLocalHour(cur)
          busyHours.add(`${date}-${hour}`)
          cur.setUTCHours(cur.getUTCHours() + 1)
        }
        // Also mark the hour containing the exact start time
        const { date: sd, hour: sh } = toLocalHour(start)
        busyHours.add(`${sd}-${sh}`)
      }

      const slots: { date: string; hour: number; free: boolean }[] = []
      for (const dateStr of localDates) {
        for (let hour = 7; hour <= 20; hour++) {
          slots.push({ date: dateStr, hour, free: !busyHours.has(`${dateStr}-${hour}`) })
        }
      }
      return slots
    }

    return res.json({
      success: true,
      data: {
        id: group.id,
        name: group.name,
        createdAt: group.created_at,
        members: members.map((m) => ({
          ...m,
          availability: computeAvailability(m.id),
        })),
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch group' })
  }
})

groupsRouter.delete('/:id', async (req, res) => {
  try {
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
      .select('id')
      .where('id', '=', req.params.id)
      .where('organizer_id', '=', organizer.id)
      .executeTakeFirst()

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' })
    }

    const memberIds = await getDb()
      .selectFrom('group_members')
      .select('id')
      .where('group_id', '=', group.id)
      .execute()

    if (memberIds.length > 0) {
      const ids = memberIds.map((m) => m.id)
      await getDb().deleteFrom('group_busy_slots').where('member_id', 'in', ids).execute()
      await getDb().deleteFrom('group_member_calendar_connections').where('member_id', 'in', ids).execute()
      await getDb().deleteFrom('group_members').where('group_id', '=', group.id).execute()
    }

    await getDb().deleteFrom('groups').where('id', '=', group.id).execute()

    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete group' })
  }
})

groupsRouter.delete('/:id/members/:memberId', async (req, res) => {
  try {
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
      .select('id')
      .where('id', '=', req.params.id)
      .where('organizer_id', '=', organizer.id)
      .executeTakeFirst()

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' })
    }

    const member = await getDb()
      .selectFrom('group_members')
      .select('id')
      .where('id', '=', req.params.memberId)
      .where('group_id', '=', group.id)
      .executeTakeFirst()

    if (!member) {
      return res.status(404).json({ success: false, error: 'Member not found' })
    }

    await getDb().deleteFrom('group_busy_slots').where('member_id', '=', member.id).execute()
    await getDb().deleteFrom('group_member_calendar_connections').where('member_id', '=', member.id).execute()
    await getDb().deleteFrom('group_members').where('id', '=', member.id).execute()

    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to remove member' })
  }
})

groupsRouter.post('/:id/invite', validate(inviteMembersSchema), async (req, res) => {
  try {
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
      .select('id')
      .where('id', '=', req.params.id)
      .where('organizer_id', '=', organizer.id)
      .executeTakeFirst()

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' })
    }

    const emails: string[] = req.body.emails
    const inserted = await getDb()
      .insertInto('group_members')
      .values(emails.map(email => ({ group_id: group.id, email })))
      .onConflict(oc => oc.columns(['group_id', 'email']).doNothing())
      .returning(['id', 'email', 'status', 'invite_token'])
      .execute()

    // Fetch the group name for the email subject
    const groupRecord = await getDb()
      .selectFrom('groups')
      .select('name')
      .where('id', '=', group.id)
      .executeTakeFirst()

    const queueErrors: string[] = []
    for (const member of inserted) {
      try {
        await inviteEmailQueue.add('send-invite', {
          email: member.email,
          groupName: groupRecord?.name ?? 'a group',
          inviteToken: member.invite_token,
        })
      } catch (qErr) {
        logger.error('Failed to queue invite email', {
          email: member.email,
          error: qErr instanceof Error ? qErr.message : String(qErr),
        })
        queueErrors.push(member.email)
      }
    }

    if (queueErrors.length > 0 && queueErrors.length === inserted.length) {
      return res.status(500).json({ success: false, error: 'Members added but invite emails could not be queued. Check Redis connection.' })
    }

    return res.status(201).json({
      success: true,
      data: {
        invited: inserted,
        ...(queueErrors.length > 0 && { emailWarning: `Could not queue emails for: ${queueErrors.join(', ')}` }),
      },
    })
  } catch (err) {
    logger.error('Failed to invite members', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to invite members' })
  }
})
