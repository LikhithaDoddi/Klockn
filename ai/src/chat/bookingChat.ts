import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT_TEXT } from './systemPrompt'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface BookingSuggestion {
  title: string
  description: string
  windowStart: string
  windowEnd: string
  label: string
}

export interface ChatResult {
  reply: string
  suggestion: BookingSuggestion | null
}

export async function chat(
  history: ChatTurn[],
  userMessage: string,
  freeWindows: Array<{ start: string; end: string; label: string }>,
): Promise<ChatResult> {
  const contextNote = freeWindows.length > 0
    ? `Free windows for this group:\n${freeWindows.map((w) => `- ${w.label} (${w.start} to ${w.end})`).join('\n')}`
    : 'No free windows found yet — members may not have connected their calendars.'

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    {
      role: 'user',
      content: `${contextNote}\n\nUser: ${userMessage}`,
    },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    system: [{ type: 'text', text: SYSTEM_PROMPT_TEXT, cache_control: { type: 'ephemeral' } }],
    messages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  const bookingMatch = text.match(/<booking>([\s\S]*?)<\/booking>/)
  let suggestion: BookingSuggestion | null = null
  let reply = text.replace(/<booking>[\s\S]*?<\/booking>/g, '').trim()

  if (bookingMatch) {
    try {
      suggestion = JSON.parse(bookingMatch[1])
    } catch {
      suggestion = null
    }
  }

  return { reply, suggestion }
}
