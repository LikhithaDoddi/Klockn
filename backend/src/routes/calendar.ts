// Calendar router — handles OAuth callbacks and free/busy reads
// GET  /calendar/google/connect    → redirect to Google OAuth consent screen
// GET  /calendar/google/callback   → exchange code for tokens, store encrypted
// POST /calendar/sync/:attendeeId  → trigger a fresh free/busy read for one attendee
// GET  /calendar/availability/:eventId → aggregate free/busy for all attendees on an event

import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

export const calendarRouter = Router()

// Initiate Google Calendar OAuth — attendee clicks "Connect Google Calendar"
calendarRouter.get('/google/connect', (req, res) => {
  // TODO: generate Google OAuth URL with calendar.readonly scope
  // TODO: include state param with attendee token to link back after redirect
  res.redirect('https://accounts.google.com/o/oauth2/auth?TODO')
})

// Google redirects here after the attendee grants calendar access
calendarRouter.get('/google/callback', async (req, res) => {
  // TODO: exchange req.query.code for access + refresh tokens
  // TODO: store encrypted refresh token in DB against attendee record
  // TODO: immediately queue a free/busy read job
  // TODO: redirect attendee to success screen
  res.json({ message: 'TODO: handle Google OAuth callback' })
})

// Force a fresh calendar read for one attendee (called by AI service when recalculating)
calendarRouter.post('/sync/:attendeeId', requireAuth, async (req, res) => {
  // TODO: queue CalendarSyncJob for this attendee
  res.json({ message: 'TODO: queue calendar sync' })
})

// Returns aggregated free/busy slots for all attendees on a given event
calendarRouter.get('/availability/:eventId', requireAuth, async (req, res) => {
  // TODO: fetch all attendee free/busy from DB
  // TODO: merge into a conflict matrix
  res.json({ availability: [] })
})
