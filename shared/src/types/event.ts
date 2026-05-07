// Event types — used by web dashboard, backend, and AI service

export type EventStatus = 'draft' | 'confirmed' | 'published' | 'cancelled'

export interface Event {
  id: string
  organizerId: string
  title: string
  description: string | null
  searchStart: string   // ISO date string — earliest the event could start
  searchEnd: string     // ISO date string — latest the event could end
  durationMinutes: number
  status: EventStatus
  confirmedStart: string | null  // Set when organizer picks a window
  confirmedEnd: string | null
  ticketPriceCents: number
  createdAt: string
}

// Constraints passed to the AI optimizer when calculating windows
export interface EventConstraints {
  searchStart: string
  searchEnd: string
  durationMinutes: number
  // Optional: restrict to certain days of week (0=Sun, 6=Sat)
  allowedDaysOfWeek?: number[]
  // Optional: restrict to certain hours (e.g. { start: 9, end: 18 } for business hours)
  hourRange?: { start: number; end: number }
}

// One of the AI-suggested optimal windows returned to the organizer
export interface TimeWindow {
  start: string           // ISO datetime
  end: string             // ISO datetime
  score: number           // 0–1, percentage of attendees free
  freeCount: number       // absolute number of free attendees
  totalCount: number      // total attendees in the event
  explanation: string     // Claude's one-sentence reasoning
}
