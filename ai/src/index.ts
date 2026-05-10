import express from 'express'
import { windowsRouter } from './routes/windows'
import { venuesRouter } from './routes/venues'
import { chatRouter } from './routes/chat'

const app = express()
const PORT = process.env.AI_SERVICE_PORT ?? 5000

app.use(express.json())

// Simple shared-secret auth — this service is internal-only
app.use((req, res, next) => {
  if (req.headers['x-internal-secret'] !== process.env.AI_SERVICE_SECRET) {
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

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  process.stdout.write(`Klockn AI service running on port ${PORT}\n`)
})
