import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
})

async function run() {
  await client.connect()
  await client.query('CREATE DATABASE klockn')
  console.log('Database klockn created successfully')
  await client.end()
}

run().catch(async (err) => {
  console.error(err.message)
  await client.end()
})
