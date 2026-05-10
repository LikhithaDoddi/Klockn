import type { ColumnType, Generated, Selectable, Insertable, Updateable } from 'kysely'

export interface OrganizersTable {
  id: Generated<string>
  firebase_uid: string
  email: string
  name: string | null
  stripe_account_id: string | null
  created_at: ColumnType<Date, never, never>
}

export interface EventsTable {
  id: Generated<string>
  organizer_id: string
  title: string
  description: string | null
  search_start: string
  search_end: string
  duration_minutes: number
  status: 'draft' | 'confirmed' | 'published' | 'cancelled'
  confirmed_start: Date | null
  confirmed_end: Date | null
  ticket_price_cents: number
  created_at: ColumnType<Date, never, never>
}

export interface AttendeesTable {
  id: Generated<string>
  event_id: string
  email: string
  name: string | null
  status: 'invited' | 'calendar_connected' | 'rsvp_confirmed' | 'ticket_purchased'
  invite_token: Generated<string>
  invited_at: ColumnType<Date, never, never>
}

export interface CalendarConnectionsTable {
  id: Generated<string>
  attendee_id: string
  provider: 'google' | 'apple'
  refresh_token_encrypted: string
  connected_at: ColumnType<Date, never, never>
  last_synced_at: Date | null
}

export interface BusySlotsTable {
  id: Generated<string>
  attendee_id: string
  starts_at: Date
  ends_at: Date
  fetched_at: ColumnType<Date, never, never>
}

export interface TicketPurchasesTable {
  id: Generated<string>
  event_id: string
  attendee_id: string | null
  stripe_session_id: string
  amount_cents: number
  platform_fee_cents: number
  purchased_at: ColumnType<Date, never, never>
}

export interface Database {
  organizers: OrganizersTable
  events: EventsTable
  attendees: AttendeesTable
  calendar_connections: CalendarConnectionsTable
  busy_slots: BusySlotsTable
  ticket_purchases: TicketPurchasesTable
}

export type Organizer = Selectable<OrganizersTable>
export type NewOrganizer = Insertable<OrganizersTable>
export type OrganizerUpdate = Updateable<OrganizersTable>
