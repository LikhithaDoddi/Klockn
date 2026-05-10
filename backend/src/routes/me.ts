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
      .select(['organizer_calendar_connections.email'])
      .where('organizers.firebase_uid', '=', req.user!.uid)
      .where('organizer_calendar_connections.provider', '=', 'google')
      .executeTakeFirst()

    return res.json({
      success: true,
      data: { connected: !!conn, email: conn?.email ?? null },
    })
  } catch (err) {
    logger.error('Failed to get calendar status', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to get calendar status' })
  }
})

// Returns hourly free/busy slots for the 7-day week starting at weekStart (YYYY-MM-DD, UTC)
meRouter.get('/availability', async (req, res) => {
  const { weekStart } = req.query
  if (!weekStart || typeof weekStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return res.status(400).json({ success: false, error: 'weekStart must be YYYY-MM-DD' })
  }

  try {
    const row = await getDb()
      .selectFrom('organizer_calendar_connections')
      .innerJoin('organizers', 'organizers.id', 'organizer_calendar_connections.organizer_id')
      .select(['organizer_calendar_connections.refresh_token_encrypted'])
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
    const freeBusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin: rangeStart.toISOString(),
        timeMax: rangeEnd.toISOString(),
        items: [{ id: 'primary' }],
      },
    })

    const busyPeriods = freeBusyRes.data.calendars?.primary?.busy ?? []

    // Build hourly slots 7am–8pm UTC for each of the 7 days
    const slots: { date: string; hour: number; free: boolean }[] = []
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dayStart = new Date(rangeStart.getTime() + dayOffset * 24 * 60 * 60 * 1000)
      const dateStr = dayStart.toISOString().slice(0, 10)
      for (let hour = 7; hour <= 20; hour++) {
        const slotStart = new Date(dayStart)
        slotStart.setUTCHours(hour, 0, 0, 0)
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000)

        const isBusy = busyPeriods.some((p) => {
          const bStart = new Date(p.start!)
          const bEnd = new Date(p.end!)
          return bStart < slotEnd && bEnd > slotStart
        })

        slots.push({ date: dateStr, hour, free: !isBusy })
      }
    }

    return res.json({ success: true, data: slots })
  } catch (err) {
    logger.error('Failed to fetch availability', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to fetch availability' })
  }
})
