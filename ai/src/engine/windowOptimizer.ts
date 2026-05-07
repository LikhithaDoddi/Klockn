// Window optimization engine — finds the top 3 time slots across attendee availability
//
// Algorithm:
// 1. Generate all candidate slots within the event's search range (step = 30 min)
// 2. For each candidate, count how many attendees are free for the full duration
// 3. Score = (free attendees / total attendees) — weighted by recency of calendar sync
// 4. Return top 3 slots by score, with Claude used to add context and reasoning

import Anthropic from '@anthropic-ai/sdk'
import { addMinutes, eachMinuteOfInterval, areIntervalsOverlapping } from 'date-fns'
import type { BusySlot, EventConstraints, TimeWindow } from '@klockn/shared'

const anthropic = new Anthropic()

export async function findOptimalWindows(
  busySlots: BusySlot[],
  constraints: EventConstraints
): Promise<TimeWindow[]> {
  const candidates = generateCandidates(constraints)
  const scored = scoreCandidates(candidates, busySlots, constraints)

  // Top 3 highest-scoring windows
  const top3 = scored.slice(0, 3)

  // Use Claude to add a human-readable explanation for each window
  const windows = await enrichWithExplanations(top3, constraints)
  return windows
}

// Generate all possible start times within the search range at 30-min intervals
function generateCandidates(constraints: EventConstraints): Date[] {
  const slots: Date[] = []
  const step = 30 // minutes

  for (
    let start = new Date(constraints.searchStart);
    addMinutes(start, constraints.durationMinutes) <= new Date(constraints.searchEnd);
    start = addMinutes(start, step)
  ) {
    // Only consider slots within business hours (9am–9pm) unless organizer overrides
    const hour = start.getHours()
    if (hour >= 9 && hour <= 21) {
      slots.push(new Date(start))
    }
  }

  return slots
}

// Score each candidate slot — higher = more attendees are free
function scoreCandidates(
  candidates: Date[],
  busySlots: BusySlot[],
  constraints: EventConstraints
): Array<{ start: Date; end: Date; score: number; freeCount: number; totalCount: number }> {
  const attendeeIds = [...new Set(busySlots.map((s) => s.attendeeId))]
  const total = attendeeIds.length

  return candidates
    .map((start) => {
      const end = addMinutes(start, constraints.durationMinutes)
      const busyAttendees = new Set<string>()

      for (const slot of busySlots) {
        // Check if this busy slot overlaps with the candidate window
        if (areIntervalsOverlapping(
          { start, end },
          { start: new Date(slot.startsAt), end: new Date(slot.endsAt) }
        )) {
          busyAttendees.add(slot.attendeeId)
        }
      }

      const freeCount = total - busyAttendees.size
      return { start, end, score: total > 0 ? freeCount / total : 0, freeCount, totalCount: total }
    })
    .sort((a, b) => b.score - a.score)
}

// Ask Claude to write a short explanation for why each window is a good pick
async function enrichWithExplanations(
  windows: Array<{ start: Date; end: Date; score: number; freeCount: number; totalCount: number }>,
  constraints: EventConstraints
): Promise<TimeWindow[]> {
  // Batch all 3 explanations in one API call to save latency
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are helping an event organizer understand why certain time windows are optimal.
For each of these top 3 windows, write one short sentence (max 15 words) explaining why it's a good pick.

Windows:
${windows.map((w, i) => `${i + 1}. ${w.start.toISOString()} — ${w.freeCount}/${w.totalCount} attendees free`).join('\n')}

Return JSON array: [{"explanation": "..."}, ...]`
    }]
  })

  let explanations: { explanation: string }[] = []
  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
    explanations = JSON.parse(text)
  } catch {
    explanations = windows.map(() => ({ explanation: '' }))
  }

  return windows.map((w, i) => ({
    start: w.start.toISOString(),
    end: w.end.toISOString(),
    score: w.score,
    freeCount: w.freeCount,
    totalCount: w.totalCount,
    explanation: explanations[i]?.explanation ?? '',
  }))
}
