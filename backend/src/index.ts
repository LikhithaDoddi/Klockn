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
import { groupInviteRouter } from './routes/groupInvite'
import { meRouter } from './routes/me'
import { ticketsRouter } from './routes/tickets'
import { webhooksRouter } from './routes/webhooks'
import { inviteRouter } from './routes/invite'
import { internalRouter } from './routes/internal'
import { authRouter } from './routes/auth'
import { aiRouter } from './routes/ai'
import { startWorkers } from './jobs/worker'
import { validateEnv } from './lib/env'

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  })
})

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — shutting down', { error: err.message, stack: err.stack })
  process.exit(1)
})

validateEnv()
initFirebase()
initDb()
if (process.env.NODE_ENV === 'production') {
  startWorkers()
}

const app = express()
const PORT = process.env.PORT ?? 4000

// Behind the ALB the real client IP lives in X-Forwarded-For; trust one proxy
// hop so express-rate-limit keys on the client rather than the load balancer.
app.set('trust proxy', 1)

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
app.use('/api/v1/groups', groupInviteRouter)   // /:id/join-link (auth required)
app.use('/api/v1', groupInviteRouter)           // /join/:token (public)
app.use('/api/v1/invite', inviteRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/internal', internalRouter)
app.use('/api/v1/ai', aiRouter)
app.use('/api/v1/events', eventsRouter)
app.use('/api/v1/attendees', attendeesRouter)
app.use('/api/v1/calendar', calendarRouter)
app.use('/api/v1/tickets', ticketsRouter)

// Centralized error handler — preserves the { success, error } contract and
// never leaks stack traces to clients. Must be the last middleware registered.
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled request error', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  })
  if (res.headersSent) return next(err)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

app.listen(PORT, () => {
  logger.info(`Klockn backend running on port ${PORT}`)
})
