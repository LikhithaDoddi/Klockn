import 'dotenv/config'
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
import { groupsRouter } from './routes/groups'
import { meRouter } from './routes/me'
import { ticketsRouter } from './routes/tickets'
import { webhooksRouter } from './routes/webhooks'
import { inviteRouter } from './routes/invite'
import { internalRouter } from './routes/internal'
import { aiRouter } from './routes/ai'
import { startWorkers } from './jobs/worker'

initFirebase()
initDb()
if (process.env.NODE_ENV === 'production') {
  startWorkers()
}

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(helmet())

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://app.klockn.com',
    'https://klockn.com',
    'https://www.klockn.com',
    'https://klockn-web.vercel.app',
    /https:\/\/klockn-.*\.vercel\.app$/,
  ],
  credentials: true,
}))

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))

// Stripe webhooks need raw body -- mount before json()
app.use('/api/webhooks', webhooksRouter)

app.use(express.json())

app.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }))

app.use('/api/v1/users', usersRouter)
app.use('/api/v1/me', meRouter)
app.use('/api/v1/groups', groupsRouter)
app.use('/api/v1/invite', inviteRouter)
app.use('/api/v1/internal', internalRouter)
app.use('/api/v1/ai', aiRouter)
app.use('/api/v1/events', eventsRouter)
app.use('/api/v1/attendees', attendeesRouter)
app.use('/api/v1/calendar', calendarRouter)
app.use('/api/v1/tickets', ticketsRouter)

app.listen(PORT, () => {
  logger.info(`Klockn backend running on port ${PORT}`)
})
