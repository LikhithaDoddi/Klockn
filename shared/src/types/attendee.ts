// Attendee types — represents a person invited to a Klockn event

export type AttendeeStatus =
  | 'invited'           // invite email sent, no action yet
  | 'calendar_connected' // connected Google/Apple calendar
  | 'rsvp_confirmed'    // confirmed attendance after window was announced
  | 'ticket_purchased'  // paid for a ticket

export interface Attendee {
  id: string
  eventId: string
  email: string
  name: string | null
  status: AttendeeStatus
  inviteToken: string
  invitedAt: string
}
