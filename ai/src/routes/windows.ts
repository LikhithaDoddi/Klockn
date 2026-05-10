// Window optimization route — the core AI capability of Klockn
// Input: list of busy slots for all attendees + event constraints
// Output: top 3 time windows ranked by attendee availability score

import { Router } from 'express'
import { findOptimalWindows } from '../engine/windowOptimizer'
import type { BusySlot, EventConstraints } from '../types'

export const windowsRouter = Router()

// POST /windows
// Body: { busySlots: BusySlot[], constraints: EventConstraints }
// Returns: { windows: TimeWindow[] } — top 3, ranked best to worst
windowsRouter.post('/', async (req, res) => {
  const { busySlots, constraints } = req.body as {
    busySlots: BusySlot[]
    constraints: EventConstraints
  }

  // TODO: validate with zod
  const windows = await findOptimalWindows(busySlots, constraints)
  res.json({ windows })
})
