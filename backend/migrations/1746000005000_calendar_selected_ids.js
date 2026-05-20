exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE organizer_calendar_connections
    ADD COLUMN IF NOT EXISTS selected_calendar_ids TEXT[] DEFAULT NULL;
  `)
}

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE organizer_calendar_connections
    DROP COLUMN IF EXISTS selected_calendar_ids;
  `)
}
