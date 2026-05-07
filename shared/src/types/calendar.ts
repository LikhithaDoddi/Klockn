// Calendar types — busy slots and calendar connection state

export type CalendarProvider = 'google' | 'apple'

export interface CalendarConnection {
  id: string
  attendeeId: string
  provider: CalendarProvider
  connectedAt: string
  lastSyncedAt: string | null
}

// A busy time block read from an attendee's calendar
// Klockn only stores busy windows — we never read event titles or details
export interface BusySlot {
  id: string
  attendeeId: string
  startsAt: string   // ISO datetime
  endsAt: string     // ISO datetime
  fetchedAt: string
}
