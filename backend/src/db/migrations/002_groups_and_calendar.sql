-- Migration 002: Groups, group member calendars, and organizer calendar connections

ALTER TABLE organizers ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Organizer's own calendar connection (for the consumer app free/busy view)
CREATE TABLE organizer_calendar_connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL DEFAULT 'google',
  email       TEXT,
  refresh_token_encrypted TEXT NOT NULL,
  connected_at  TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ,
  UNIQUE(organizer_id, provider)
);

-- Groups — scheduling groups created by an organizer
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Group members — people invited into a group
CREATE TABLE group_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  status      TEXT NOT NULL DEFAULT 'invited',
  invite_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  invited_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, email)
);

-- Calendar connections for group members
CREATE TABLE group_member_calendar_connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID REFERENCES group_members(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL DEFAULT 'google',
  refresh_token_encrypted TEXT NOT NULL,
  connected_at  TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ,
  UNIQUE(member_id, provider)
);

-- Busy slots for group members — cached from their calendars
CREATE TABLE group_busy_slots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID REFERENCES group_members(id) ON DELETE CASCADE,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  fetched_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX group_busy_slots_member_time ON group_busy_slots(member_id, starts_at, ends_at);
