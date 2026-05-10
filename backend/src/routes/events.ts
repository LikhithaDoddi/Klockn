import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'

export const eventsRouter = Router()

eventsRouter.use(requireAuth)

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  search_start: z.string().datetime(),
  search_end: z.string().datetime(),
  duration_minutes: z.number().int().min(15).max(480),
  ticket_price_cents: z.number().int().min(0).default(0),
})

eventsRouter.post('/', validate(createEventSchema), async (req, res) => {
  // TODO: insert event into DB
  // TODO: queue job to send invite emails to all attendees
  res.status(201).json({ message: 'TODO: create event' })
})

eventsRouter.get('/', async (req, res) => {
  // TODO: query events WHERE organizer_uid = req.user.uid
  res.json({ events: [] })
})

eventsRouter.get('/:id', async (req, res) => {
  // TODO: fetch event + attendee availability summary
  // TODO: call AI service to get/refresh top 3 window suggestions
  res.json({ event: null })
})

eventsRouter.patch('/:id', async (req, res) => {
  // TODO: allow organizer to lock in a window (status → confirmed)
  // TODO: trigger RSVP emails + calendar invites to all attendees
  res.json({ message: 'TODO: update event' })
})

eventsRouter.delete('/:id', async (req, res) => {
  // TODO: soft-delete event, send cancellation notifications
  res.json({ message: 'TODO: cancel event' })
})
