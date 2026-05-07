// Venue suggestion route — recommends venues and activities given attendee location data
// Input: array of attendee approximate locations (city-level, never precise)
// Output: top venue + activity suggestions with reasoning

import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

export const venuesRouter = Router()

const anthropic = new Anthropic()

// POST /venues
// Body: { locations: string[], eventType: string, attendeeCount: number, confirmedWindow: { start, end } }
venuesRouter.post('/', async (req, res) => {
  const { locations, eventType, attendeeCount, confirmedWindow } = req.body

  // Find geographic center of attendee cluster (simple centroid for now)
  // TODO: replace with proper geocoding + centroid calculation
  const locationSummary = locations.length > 0
    ? `Most attendees are near: ${[...new Set(locations)].join(', ')}`
    : 'Attendee locations unknown'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You are a corporate event venue advisor. Suggest 3 venues for this event:

Event type: ${eventType}
Attendee count: ${attendeeCount}
Time window: ${confirmedWindow.start} to ${confirmedWindow.end}
${locationSummary}

For each venue suggest: name, why it works for this group, and one activity idea.
Return JSON: [{ "venue": "...", "reason": "...", "activity": "..." }]`
    }]
  })

  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
    res.json({ suggestions: JSON.parse(text) })
  } catch {
    res.json({ suggestions: [] })
  }
})
