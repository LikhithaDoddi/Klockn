exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS organizers (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      firebase_uid TEXT UNIQUE NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      name        TEXT,
      stripe_account_id TEXT,
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS events (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT,
      search_start DATE NOT NULL,
      search_end   DATE NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 120,
      status      TEXT NOT NULL DEFAULT 'draft',
      confirmed_start TIMESTAMPTZ,
      confirmed_end   TIMESTAMPTZ,
      ticket_price_cents INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS attendees (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
      email       TEXT NOT NULL,
      name        TEXT,
      status      TEXT NOT NULL DEFAULT 'invited',
      invite_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
      invited_at  TIMESTAMPTZ DEFAULT now(),
      UNIQUE(event_id, email)
    );

    CREATE TABLE IF NOT EXISTS calendar_connections (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      attendee_id   UUID REFERENCES attendees(id) ON DELETE CASCADE,
      provider      TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
      refresh_token_encrypted TEXT NOT NULL,
      connected_at  TIMESTAMPTZ DEFAULT now(),
      last_synced_at TIMESTAMPTZ,
      UNIQUE(attendee_id, provider)
    );

    CREATE TABLE IF NOT EXISTS busy_slots (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      attendee_id  UUID REFERENCES attendees(id) ON DELETE CASCADE,
      starts_at    TIMESTAMPTZ NOT NULL,
      ends_at      TIMESTAMPTZ NOT NULL,
      fetched_at   TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS busy_slots_attendee_time ON busy_slots(attendee_id, starts_at, ends_at);

    CREATE TABLE IF NOT EXISTS ticket_purchases (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
      attendee_id     UUID REFERENCES attendees(id),
      stripe_session_id TEXT UNIQUE NOT NULL,
      amount_cents    INTEGER NOT NULL,
      platform_fee_cents INTEGER NOT NULL,
      purchased_at    TIMESTAMPTZ DEFAULT now()
    );
  `)
}

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS ticket_purchases;
    DROP TABLE IF EXISTS busy_slots;
    DROP TABLE IF EXISTS calendar_connections;
    DROP TABLE IF EXISTS attendees;
    DROP TABLE IF EXISTS events;
    DROP TABLE IF EXISTS organizers;
  `)
}
