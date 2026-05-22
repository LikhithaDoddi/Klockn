import type { ColumnType, Generated, Selectable, Insertable, Updateable } from 'kysely'

export interface OrganizersTable {
  id: Generated<string>
  firebase_uid: string
  email: string
  name: string | null
  stripe_account_id: string | null
  push_token: string | null  // registered via PATCH /users/me/push-token
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

export interface GroupsTable {
  id: Generated<string>
  organizer_id: string
  name: string
  created_at: ColumnType<Date, never, never>
}

export interface GroupMembersTable {
  id: Generated<string>
  group_id: string
  email: string
  name: string | null
  status: ColumnType<'invited' | 'calendar_connected', ('invited' | 'calendar_connected') | undefined, 'invited' | 'calendar_connected'>
  invite_token: Generated<string>
  invited_at: ColumnType<Date, never, never>
}

export interface GroupMemberCalendarConnectionsTable {
  id: Generated<string>
  member_id: string
  provider: 'google' | 'apple'
  refresh_token_encrypted: string
  connected_at: ColumnType<Date, never, never>
  last_synced_at: Date | null
}

export interface OrganizerCalendarConnectionsTable {
  id: Generated<string>
  organizer_id: string
  provider: ColumnType<'google', 'google' | undefined, 'google'>
  email: string | null
  refresh_token_encrypted: string
  selected_calendar_ids: string[] | null
  connected_at: ColumnType<Date, never, never>
  last_synced_at: Date | null
}

export interface GroupBusySlotsTable {
  id: Generated<string>
  member_id: string
  starts_at: Date
  ends_at: Date
  fetched_at: ColumnType<Date, never, never>
}

export interface GroupJoinLinksTable {
  id: Generated<string>
  token: string
  group_id: string
  created_by: string
  used_count: ColumnType<number, number | undefined, number>
  created_at: ColumnType<Date, never, never>
  expires_at: ColumnType<Date, Date | undefined, Date>
}

export interface Database {
  organizers: OrganizersTable
  organizer_calendar_connections: OrganizerCalendarConnectionsTable
  events: EventsTable
  attendees: AttendeesTable
  calendar_connections: CalendarConnectionsTable
  busy_slots: BusySlotsTable
  ticket_purchases: TicketPurchasesTable
  groups: GroupsTable
  group_members: GroupMembersTable
  group_member_calendar_connections: GroupMemberCalendarConnectionsTable
  group_busy_slots: GroupBusySlotsTable
  group_join_links: GroupJoinLinksTable
}

export type Organizer = Selectable<OrganizersTable>
export type NewOrganizer = Insertable<OrganizersTable>
export type OrganizerUpdate = Updateable<OrganizersTable>
