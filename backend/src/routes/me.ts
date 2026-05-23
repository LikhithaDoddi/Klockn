import { Router } from 'express'
import { z } from 'zod'
import { google } from 'googleapis'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { getDb } from '../db/client'
import { decrypt } from '../lib/encrypt'
import { logger } from '../lib/logger'

export const meRouter = Router()

meRouter.use(requireAuth)

meRouter.get('/', async (req, res) => {
  try {
    const organizer = await getDb()
      .selectFrom('organizers')
      .selectAll()
      .where('firebase_uid', '=', req.user!.uid)
      .executeTakeFirst()

    if (!organizer) {
      return res.status(404).json({ success: false, error: 'User profile not found' })
    }

    return res.json({
      success: true,
      data: {
        id: organizer.id,
        email: organizer.email,
        name: organizer.name,
        stripeAccountId: organizer.stripe_account_id,
        createdAt: organizer.created_at,
      },
    })
  } catch (err) {
    logger.error('Failed to fetch user profile', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to fetch user profile' })
  }
})

const pushTokenSchema = z.object({
  token: z.string().min(1),
})

meRouter.patch('/push-token', validate(pushTokenSchema), async (req, res) => {
  try {
    const result = await getDb()
      .updateTable('organizers')
      .set({ push_token: req.body.token })
      .where('firebase_uid', '=', req.user!.uid)
      .returning('id')
      .executeTakeFirst()

    if (!result) {
      return res.status(404).json({ success: false, error: 'User profile not found' })
    }

    return res.json({ success: true, data: null })
  } catch (err) {
    logger.error('Failed to update push token', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to update push token' })
  }
})

meRouter.get('/calendar', async (req, res) => {
  try {
    const conn = await getDb()
      .selectFrom('organizer_calendar_connections')
      .innerJoin('organizers', 'organizers.id', 'organizer_calendar_connections.organizer_id')
      .select(['organizer_calendar_connections.email', 'organizer_calendar_connections.selected_calendar_ids'])
      .where('organizers.firebase_uid', '=', req.user!.uid)
      .where('organizer_calendar_connections.provider', '=', 'google')
      .executeTakeFirst()

    return res.json({
      success: true,
      data: {
        connected: !!conn,
        email: conn?.email ?? null,
        selectedCalendarIds: conn?.selected_calendar_ids ?? null,
      },
    })
  } catch (err) {
    logger.error('Failed to get calendar status', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to get calendar status' })
  }
})

// List all Google calendars for the current user
meRouter.get('/calendars', async (req, res) => {
  try {
    const row = await getDb()
      .selectFrom('organizer_calendar_connections')
      .innerJoin('organizers', 'organizers.id', 'organizer_calendar_connections.organizer_id')
      .select(['organizer_calendar_connections.refresh_token_encrypted', 'organizer_calendar_connections.selected_calendar_ids'])
      .where('organizers.firebase_uid', '=', req.user!.uid)
      .where('organizer_calendar_connections.provider', '=', 'google')
      .executeTakeFirst()

    if (!row) return res.status(404).json({ success: false, error: 'No calendar connected' })

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4000/api/v1/calendar/google/callback'
    )
    oauth2Client.setCredentials({ refresh_token: decrypt(row.refresh_token_encrypted) })

    const cal = google.calendar({ version: 'v3', auth: oauth2Client })
    const listRes = await cal.calendarList.list({ minAccessRole: 'reader' })
    const calendars = (listRes.data.items ?? []).map((c) => ({
      id: c.id!,
      name: c.summary ?? c.id!,
      primary: !!c.primary,
      color: c.backgroundColor ?? '#7C3AED',
    }))

    return res.json({
      success: true,
      data: { calendars, selectedIds: row.selected_calendar_ids },
    })
  } catch (err) {
    logger.error('Failed to list calendars', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to list calendars' })
  }
})

// Save the user's selected calendar IDs
meRouter.patch('/calendars', async (req, res) => {
  const { selectedIds } = req.body
  if (!Array.isArray(selectedIds) || selectedIds.some((id) => typeof id !== 'string')) {
    return res.status(400).json({ success: false, error: 'selectedIds must be an array of strings' })
  }
  try {
    const organizer = await getDb()
      .selectFrom('organizers')
      .select('id')
      .where('firebase_uid', '=', req.user!.uid)
      .executeTakeFirst()

    if (!organizer) return res.status(404).json({ success: false, error: 'User not found' })

    await getDb()
      .updateTable('organizer_calendar_connections')
      .set({ selected_calendar_ids: selectedIds })
      .where('organizer_id', '=', organizer.id)
      .where('provider', '=', 'google')
      .execute()

    return res.json({ success: true, data: null })
  } catch (err) {
    logger.error('Failed to save calendar selection', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to save calendar selection' })
  }
})

meRouter.delete('/', async (req, res) => {
  try {
    const organizer = await getDb()
      .selectFrom('organizers')
      .select('id')
      .where('firebase_uid', '=', req.user!.uid)
      .executeTakeFirst()

    if (!organizer) return res.status(404).json({ success: false, error: 'User not found' })

    // Delete all user data in order (FK constraints)
    const orgGroupIds = getDb().selectFrom('groups').select('id').where('organizer_id', '=', organizer.id)
    const orgMemberIds = getDb().selectFrom('group_members').select('id').where('group_id', 'in', orgGroupIds)
    await getDb().deleteFrom('group_busy_slots').where('member_id', 'in', orgMemberIds).execute()
    await getDb().deleteFrom('group_members').where('group_id', 'in', orgGroupIds).execute()
    await getDb().deleteFrom('organizer_calendar_connections').where('organizer_id', '=', organizer.id).execute()
    await getDb().deleteFrom('groups').where('organizer_id', '=', organizer.id).execute()
    await getDb().deleteFrom('organizers').where('id', '=', organizer.id).execute()

    logger.info('Account deleted', { uid: req.user!.uid })
    return res.json({ success: true, data: null })
  } catch (err) {
    logger.error('Failed to delete account', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to delete account' })
  }
})

// Returns exact busy periods for the 7-day week starting at weekStart (YYYY-MM-DD in user's local tz)
// Response: { busyPeriods: { date: string, startMinute: number, endMinute: number }[] }
// date is YYYY-MM-DD in user's timezone, minutes are from midnight in user's timezone
meRouter.get('/availability', async (req, res) => {
  const { weekStart, timezone } = req.query
  if (!weekStart || typeof weekStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ success: false, error: 'weekStart must be YYYY-MM-DD' })
  }
  const tz = typeof timezone === 'string' ? timezone : 'UTC'

  try {
    const row = await getDb()
      .selectFrom('organizer_calendar_connections')
      .innerJoin('organizers', 'organizers.id', 'organizer_calendar_connections.organizer_id')
      .select(['organizer_calendar_connections.refresh_token_encrypted', 'organizer_calendar_connections.selected_calendar_ids'])
      .where('organizers.firebase_uid', '=', req.user!.uid)
      .where('organizer_calendar_connections.provider', '=', 'google')
      .executeTakeFirst()

    if (!row) {
      return res.status(404).json({ success: false, error: 'No calendar connected' })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4000/api/v1/calendar/google/callback'
    )
    oauth2Client.setCredentials({ refresh_token: decrypt(row.refresh_token_encrypted) })

    // Query one extra day on each side so timezone shifts don't clip events
    const rangeStart = new Date(`${weekStart}T00:00:00.000Z`)
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 1)
    const rangeEnd = new Date(rangeStart.getTime() + 9 * 24 * 60 * 60 * 1000)

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    let calendarIds: string[]
    if (row.selected_calendar_ids?.length) {
      calendarIds = row.selected_calendar_ids
    } else {
      const listRes = await calendar.calendarList.list({ minAccessRole: 'reader' })
      calendarIds = (listRes.data.items ?? []).map((c) => c.id!).filter(Boolean)
      if (calendarIds.length === 0) calendarIds = ['primary']
    }

    const freeBusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin: rangeStart.toISOString(),
        timeMax: rangeEnd.toISOString(),
        items: calendarIds.map((id) => ({ id })),
      },
    })

    const rawBusy = calendarIds.flatMap((id) => freeBusyRes.data.calendars?.[id]?.busy ?? [])

    // Extract local date + minute from a UTC Date in the user's timezone
    const localPartsFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })

    function toLocalDateMinute(d: Date): { date: string; minute: number } {
      const parts = localPartsFmt.formatToParts(d)
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0'
      const h = parseInt(get('hour'))
      const m = parseInt(get('minute'))
      // hour12:false can return '24' for midnight — normalise
      return {
        date: `${get('year')}-${get('month')}-${get('day')}`,
        minute: (h === 24 ? 0 : h) * 60 + m,
      }
    }

    const busyPeriods: { date: string; startMinute: number; endMinute: number }[] = []

    for (const p of rawBusy) {
      if (!p.start || !p.end) continue
      const bStart = new Date(p.start)
      const bEnd = new Date(p.end)
      const start = toLocalDateMinute(bStart)
      const end = toLocalDateMinute(bEnd)

      if (start.date === end.date) {
        busyPeriods.push({ date: start.date, startMinute: start.minute, endMinute: end.minute })
      } else {
        // Spans midnight — split into two entries
        busyPeriods.push({ date: start.date, startMinute: start.minute, endMinute: 1440 })
        busyPeriods.push({ date: end.date, startMinute: 0, endMinute: end.minute })
      }
    }

    return res.json({ success: true, data: { busyPeriods } })
  } catch (err) {
    logger.error('Failed to fetch availability', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to fetch availability' })
  }
})
