exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS organizer_calendar_connections (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organizer_id  UUID REFERENCES organizers(id) ON DELETE CASCADE,
      provider      TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
      email         TEXT,
      refresh_token_encrypted TEXT NOT NULL,
      connected_at  TIMESTAMPTZ DEFAULT now(),
      last_synced_at TIMESTAMPTZ,
      UNIQUE(organizer_id, provider)
    );
  `)
}

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS organizer_calendar_connections;`)
}
