exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS groups (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
      email       TEXT NOT NULL,
      name        TEXT,
      status      TEXT NOT NULL DEFAULT 'invited',
      invite_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
      invited_at  TIMESTAMPTZ DEFAULT now(),
      UNIQUE(group_id, email)
    );

    CREATE TABLE IF NOT EXISTS group_member_calendar_connections (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id     UUID REFERENCES group_members(id) ON DELETE CASCADE,
      provider      TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
      refresh_token_encrypted TEXT NOT NULL,
      connected_at  TIMESTAMPTZ DEFAULT now(),
      last_synced_at TIMESTAMPTZ,
      UNIQUE(member_id, provider)
    );

    CREATE TABLE IF NOT EXISTS group_busy_slots (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id   UUID REFERENCES group_members(id) ON DELETE CASCADE,
      starts_at   TIMESTAMPTZ NOT NULL,
      ends_at     TIMESTAMPTZ NOT NULL,
      fetched_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS group_busy_slots_member_time
      ON group_busy_slots(member_id, starts_at, ends_at);
  `)
}

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS group_busy_slots;
    DROP TABLE IF EXISTS group_member_calendar_connections;
    DROP TABLE IF EXISTS group_members;
    DROP TABLE IF EXISTS groups;
  `)
}
