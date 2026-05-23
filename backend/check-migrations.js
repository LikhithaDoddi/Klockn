const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
c.connect()
  .then(() => c.query('SELECT name FROM pgmigrations ORDER BY run_on'))
  .then(r => { console.log(r.rows); c.end() })
  .catch(err => { console.error(err.message); c.end() })
