import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'

import { initFirebase } from './lib/firebase'
import { initDb } from './db/client'
import { logger } from './lib/logger'

import { usersRouter } from './routes/users'
import { eventsRouter } from './routes/events'
import { attendeesRouter } from './routes/attendees'
import { calendarRouter } from './routes/calendar'
import { ticketsRouter } from './routes/tickets'
import { webhooksRouter } from './routes/webhooks'

initFirebase()
initDb()

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(helmet())

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://app.klockn.com',
  ],
  credentials: true,
}))

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))

// Stripe webhooks need raw body — mount before json()
app.use('/api/webhooks', webhooksRouter)

app.use(express.json())

app.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }))

app.use('/api/v1/users', usersRouter)
app.use('/api/v1/events', eventsRouter)
app.use('/api/v1/attendees', attendeesRouter)
app.use('/api/v1/calendar', calendarRouter)
app.use('/api/v1/tickets', ticketsRouter)

app.listen(PORT, () => {
  logger.info(`Klockn backend running on port ${PORT}`)
})
