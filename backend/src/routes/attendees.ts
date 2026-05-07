// Attendees router — manage attendee lists and invite status
// POST /attendees/invite        → send invite emails to a list of addresses
// GET  /attendees/:eventId      → list all attendees for an event with their calendar status
// GET  /attendees/invite/:token → validate an invite token (used by mobile app on deep link)

import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

export const attendeesRouter = Router()

// Send invites — organizer calls this after uploading attendee list
attendeesRouter.post('/invite', requireAuth, async (req, res) => {
  // TODO: validate list of emails
  // TODO: create attendee records in DB with status = 'invited'
  // TODO: queue SendInviteEmailJob for each attendee
  res.status(201).json({ message: 'TODO: send invites' })
})

// List attendees for event with their calendar connection status
attendeesRouter.get('/:eventId', requireAuth, async (req, res) => {
  // TODO: query attendees JOIN calendar_connections for this event
  res.json({ attendees: [] })
})

// Validate invite token — no auth needed (attendee hasn't logged in yet)
attendeesRouter.get('/invite/:token', async (req, res) => {
  // TODO: look up token in invite_tokens table
  // TODO: return event details + attendee identity if token is valid
  res.json({ valid: false })
})
