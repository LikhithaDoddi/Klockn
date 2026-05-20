import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { getDb } from '../db/client'
import { inviteEmailQueue } from '../jobs/queues'
import { logger } from '../lib/logger'

export const groupsRouter = Router()

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

    const rangeStart = new Date(`${weekStart}T00:00:00Z`)
    const rangeEnd = new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000)

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
