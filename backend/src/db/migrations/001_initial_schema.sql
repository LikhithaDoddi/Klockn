-- ─────────────────────────────────────────────────────────
-- Migration 001: Initial Klockn schema
-- Run with: npm run db:migrate
-- ─────────────────────────────────────────────────────────

-- Organizers — event creators, authenticate via Firebase Auth
CREATE TABLE organizers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE NOT NULL,  -- matches Firebase UID for JWT verification
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  -- Stripe Connect account ID — required before organizer can collect ticket revenue
  stripe_account_id TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Events — created by organizers
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  -- Date range the organizer is willing to hold the event within
  search_start DATE NOT NULL,
  search_end   DATE NOT NULL,
  -- Duration of the event in minutes (e.g. 120 = 2 hours)
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  -- draft → collecting availability | confirmed → window locked | published → ticketing live | cancelled
  status      TEXT NOT NULL DEFAULT 'draft',
  -- The window the organizer chose (set when status → confirmed)
  confirmed_start TIMESTAMPTZ,
  confirmed_end   TIMESTAMPTZ,
  ticket_price_cents INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Attendees — people invited to an event
CREATE TABLE attendees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  -- invited → calendar_connected → rsvp_confirmed → ticket_purchased
  status      TEXT NOT NULL DEFAULT 'invited',
  -- One-time token sent in invite email — used to identify attendee before they log in
  invite_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  invited_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, email)
);

-- Calendar connections — stores OAuth tokens for attendees who connected their calendar
CREATE TABLE calendar_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id   UUID REFERENCES attendees(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  -- Encrypted with AES-256 before storage — never store plaintext tokens
  refresh_token_encrypted TEXT NOT NULL,
  connected_at  TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ,
  UNIQUE(attendee_id, provider)
);

-- Free/busy slots — cached availability read from attendee calendars
-- Rows represent BUSY windows; absence = free
CREATE TABLE busy_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id  UUID REFERENCES attendees(id) ON DELETE CASCADE,
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ NOT NULL,
  -- When we fetched this from the calendar API — used to know when to re-sync
  fetched_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX busy_slots_attendee_time ON busy_slots(attendee_id, starts_at, ends_at);

-- Ticket purchases — records of Stripe payments
CREATE TABLE ticket_purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  attendee_id     UUID REFERENCES attendees(id),
  stripe_session_id TEXT UNIQUE NOT NULL,
  amount_cents    INTEGER NOT NULL,
  -- 2% platform fee retained by Klockn
  platform_fee_cents INTEGER NOT NULL,
  purchased_at    TIMESTAMPTZ DEFAULT now()
);
