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
      process.env.GOOGLE_REDIRECT_URI
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

// Returns hourly free/busy slots for the 7-day week starting at weekStart (YYYY-MM-DD, UTC)
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
      process.env.GOOGLE_REDIRECT_URI
    )
    oauth2Client.setCredentials({ refresh_token: decrypt(row.refresh_token_encrypted) })

    const rangeStart = new Date(`${weekStart}T00:00:00.000Z`)
    const rangeEnd = new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Always fetch all calendars — use saved selection or all available
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

    const busyPeriods = calendarIds.flatMap(
      (id) => freeBusyRes.data.calendars?.[id]?.busy ?? []
    )

    // Convert a local date+time in the user's timezone to UTC
    function localTimeToUTC(dateStr: string, localHour: number, localMinute: number): Date {
      const candidate = new Date(`${dateStr}T${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}:00Z`)
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false,
      }).formatToParts(candidate)
      const localH = parseInt(parts.find((p) => p.type === 'hour')!.value)
      const localM = parseInt(parts.find((p) => p.type === 'minute')!.value)
      const driftMs = ((localHour - localH) * 60 + (localMinute - localM)) * 60 * 1000
      return new Date(candidate.getTime() + driftMs)
    }

    const dateFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    })

    const slots: { date: string; time: string; free: boolean }[] = []
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dayUTC = new Date(rangeStart.getTime() + dayOffset * 24 * 60 * 60 * 1000)
      const localDateStr = dateFmt.format(dayUTC)
      for (let hour = 0; hour <= 23; hour++) {
        for (const minute of [0, 30]) {
          const slotStart = localTimeToUTC(localDateStr, hour, minute)
          const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
          const isBusy = busyPeriods.some((p) => {
            const bStart = new Date(p.start!)
            const bEnd = new Date(p.end!)
            return bStart < slotEnd && bEnd > slotStart
          })
          const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
          slots.push({ date: localDateStr, time: timeStr, free: !isBusy })
        }
      }
    }

    return res.json({ success: true, data: slots })
  } catch (err) {
    logger.error('Failed to fetch availability', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to fetch availability' })
  }
})
