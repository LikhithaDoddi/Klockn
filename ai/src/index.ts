import './loadEnv'
import express from 'express'
import { windowsRouter } from './routes/windows'
import { venuesRouter } from './routes/venues'
import { chatRouter } from './routes/chat'
import { validateEnv } from './env'

process.on('unhandledRejection', (reason) => {
  process.stderr.write(
    `Unhandled promise rejection: ${reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)}\n`,
  )
})

process.on('uncaughtException', (err) => {
  process.stderr.write(`Uncaught exception — shutting down: ${err.stack ?? err.message}\n`)
  process.exit(1)
})

validateEnv()

const app = express()
const PORT = process.env.AI_SERVICE_PORT ?? 5000

app.use(express.json())

// Health check stays public so the load balancer / ECS can probe it without the
// internal secret. Must be registered before the auth gate below.
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Simple shared-secret auth — this service is internal-only. Reject when the
// secret is unset so a missing env can never become an open door.
app.use((req, res, next) => {
  const secret = process.env.AI_SERVICE_SECRET
  if (!secret || req.headers['x-internal-secret'] !== secret) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
})

// POST /windows → returns top 3 optimal time windows given attendee busy slots
app.use('/windows', windowsRouter)

// POST /venues → returns venue + activity suggestions given location cluster
app.use('/venues', venuesRouter)

// POST /chat → AI booking conversation
app.use('/chat', chatRouter)

// Centralized error handler — last middleware. Never leak internals to callers.
app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  process.stderr.write(`Unhandled request error: ${err.stack ?? err.message}\n`)
  if (res.headersSent) return next(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  process.stdout.write(`Klockn AI service running on port ${PORT}\n`)
})
