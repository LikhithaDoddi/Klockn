const { Client } = require('pg')
const c = new Client({
  connectionString: 'postgresql://klocknadmin:klockn2026@klockn-db.cdswycsau35a.us-east-2.rds.amazonaws.com:5432/klockn',
  ssl: { rejectUnauthorized: false },
})
c.connect()
  .then(() => c.query('SELECT name FROM pgmigrations ORDER BY run_on'))
  .then(r => { console.log(r.rows); c.end() })
  .catch(err => { console.error(err.message); c.end() })
