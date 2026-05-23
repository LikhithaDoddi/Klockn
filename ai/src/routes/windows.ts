// Window optimization route — the core AI capability of Klockn
// Input: list of busy slots for all attendees + event constraints
// Output: top 3 time windows ranked by attendee availability score

import { Router } from 'express'
import { z } from 'zod'
import { findOptimalWindows } from '../engine/windowOptimizer'

export const windowsRouter = Router()

const busySlotSchema = z.object({
  id: z.string(),
  attendeeId: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  fetchedAt: z.string(),
})

const constraintsSchema = z.object({
  searchStart: z.string(),
  searchEnd: z.string(),
  durationMinutes: z.number().positive(),
  allowedDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  hourRange: z.object({ start: z.number(), end: z.number() }).optional(),
})

const bodySchema = z.object({
  busySlots: z.array(busySlotSchema),
  constraints: constraintsSchema,
})

// POST /windows
// Body: { busySlots: BusySlot[], constraints: EventConstraints }
// Returns: { windows: TimeWindow[] } — top 3, ranked best to worst
windowsRouter.post('/', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request body' })
  }

  const { busySlots, constraints } = parsed.data
  const windows = await findOptimalWindows(busySlots, constraints)
  return res.json({ windows })
})
