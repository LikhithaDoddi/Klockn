import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'

export const attendeesRouter = Router()

const inviteSchema = z.object({
  event_id: z.string().uuid(),
  emails: z.array(z.string().email()).min(1).max(500),
})

attendeesRouter.post('/invite', requireAuth, validate(inviteSchema), async (req, res) => {
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
