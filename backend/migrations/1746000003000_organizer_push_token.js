exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE organizers ADD COLUMN IF NOT EXISTS push_token TEXT;
  `)
}

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE organizers DROP COLUMN IF EXISTS push_token;
  `)
}
