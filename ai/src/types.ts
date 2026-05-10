export interface BusySlot {
  id: string
  attendeeId: string
  startsAt: string
  endsAt: string
  fetchedAt: string
}

export interface EventConstraints {
  searchStart: string
  searchEnd: string
  durationMinutes: number
  allowedDaysOfWeek?: number[]
  hourRange?: { start: number; end: number }
}

export interface TimeWindow {
  start: string
  end: string
  score: number
  freeCount: number
  totalCount: number
  explanation: string
}
