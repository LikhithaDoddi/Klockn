// Backend entry point — boots Express server, registers routes, connects DB
// All API routes are prefixed with /api/v1

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'

import { eventsRouter } from './routes/events'
import { attendeesRouter } from './routes/attendees'
import { calendarRouter } from './routes/calendar'
import { ticketsRouter } from './routes/tickets'
import { webhooksRouter } from './routes/webhooks'

const app = express()
const PORT = process.env.PORT ?? 4000

// Security headers
app.use(helmet())

// CORS — allow web dashboard and mobile app origins
app.use(cors({
  origin: [
    'http://localhost:3000',          // web dev
    'https://app.klockn.com',         // web prod
  ],
  credentials: true,
}))

// Rate limiting — protects against abuse
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))

// Stripe webhooks must receive raw body before JSON parsing
app.use('/api/webhooks', webhooksRouter)

// JSON body parsing for all other routes
app.use(express.json())

// API routes
app.use('/api/v1/events', eventsRouter)
app.use('/api/v1/attendees', attendeesRouter)
app.use('/api/v1/calendar', calendarRouter)
app.use('/api/v1/tickets', ticketsRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`Klockn backend running on port ${PORT}`)
})
