exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS group_join_links (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token       TEXT NOT NULL UNIQUE,
      group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      created_by  UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
      used_count  INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
    );

    CREATE INDEX IF NOT EXISTS idx_group_join_links_token    ON group_join_links(token);
    CREATE INDEX IF NOT EXISTS idx_group_join_links_group_id ON group_join_links(group_id);
  `)
}

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_group_join_links_group_id;
    DROP INDEX IF EXISTS idx_group_join_links_token;
    DROP TABLE IF EXISTS group_join_links;
  `)
}
