// Events router — CRUD for organizer events
// POST /events       → create new event, trigger attendee invites
// GET  /events       → list organizer's events
// GET  /events/:id   → get single event with availability data
// PATCH /events/:id  → update event (pick window, publish)
// DELETE /events/:id → cancel event

import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

export const eventsRouter = Router()

// All event routes require the organizer to be authenticated
eventsRouter.use(requireAuth)

eventsRouter.post('/', async (req, res) => {
  // TODO: validate body with zod
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
