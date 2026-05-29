import { Router } from 'express'
import { z } from 'zod'
import { chat, ChatTurn } from '../chat/bookingChat'

export const chatRouter = Router()

const chatSchema = z.object({
  groupId: z.string().uuid().optional(),
  message: z.string().min(1).max(500),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).default([]),
  freeWindows: z.array(z.object({
    start: z.string().min(1),
    end: z.string().min(1),
    label: z.string().min(1),
  })).default([]),
})

chatRouter.post('/', async (req, res) => {
  const result = chatSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error.issues.map((i) => i.message).join(', ') })
  }

  const { message, history, freeWindows } = result.data

  try {
    const windows = freeWindows.map((w) => ({ start: w.start, end: w.end, label: w.label }))
    const chatResult = await chat(history as ChatTurn[], message, windows)
    return res.json({ success: true, data: chatResult })
  } catch (err) {
    process.stderr.write(`Chat error: ${err instanceof Error ? err.message : String(err)}\n`)
    return res.status(500).json({ success: false, error: 'AI service unavailable' })
  }
})
