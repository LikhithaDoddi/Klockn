'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  suggestion?: BookingSuggestion | null
}

interface BookingSuggestion {
  type: string
  title: string
  datetime: string
  duration: string
  notes?: string
}

const WELCOME = (groupName: string): Message => ({
  id: 'welcome',
  role: 'assistant',
  content: `Hey! I've looked at everyone's availability in **${groupName}**. Ask me to find a time, suggest something to do, or just say "what works this week?" and I'll take it from there.`,
})

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [groupName, setGroupName] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load group name
  useEffect(() => {
    api.get<{ success: boolean; data: { id: string; name: string; members: unknown[] } }>(`/api/v1/groups/${id}`)
      .then((r) => {
        const name = r.data.data.name
        setGroupName(name)
        setMessages([WELCOME(name)])
      })
      .catch(() => setMessages([WELCOME('your group')]))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setSending(true)
    setError(null)

    // Auto-resize textarea back down
    if (inputRef.current) inputRef.current.style.height = 'auto'

    try {
      const history = newMessages
        .filter((m) => m.id !== 'welcome')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await api.post<{ success: boolean; data: { reply: string; suggestion: BookingSuggestion | null } }>(
        '/api/v1/ai/chat',
        { groupId: id, message: text, history },
        { timeout: 35000 }
      )

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: res.data.data.reply,
          suggestion: res.data.data.suggestion,
        },
      ])
    } catch {
      setError('AI is unavailable right now. Try again in a moment.')
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
      setInput(text)
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    // Auto-grow textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-black/6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-[#71717A] hover:text-[#09090B] hover:bg-gray-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center shadow-sm">
            <AISparkle />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#09090B] leading-tight">Klockn AI</p>
            {groupName && <p className="text-xs text-[#71717A]">{groupName}</p>}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-green-700">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-4 scroll-smooth">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {sending && <TypingIndicator />}

        {error && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs px-4 py-2 rounded-full">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="#EF4444" strokeWidth="1.2"/>
                <path d="M6 4v2.5M6 8h.01" stroke="#EF4444" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions row */}
      {messages.length <= 1 && (
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {[
            'What times work this week?',
            'Find a 2-hour slot for everyone',
            'When is everyone free on Friday?',
            'Suggest something for the weekend',
          ].map((s) => (
            <button
              key={s}
              onClick={() => { setInput(s); inputRef.current?.focus() }}
              className="flex-shrink-0 px-3.5 py-2 rounded-full border border-[#7C3AED]/20 bg-purple-50/60 text-xs font-medium text-[#7C3AED] hover:bg-purple-50 hover:border-[#7C3AED]/40 transition-all whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="pb-2">
        <div className="flex items-end gap-3 bg-white rounded-2xl border-2 border-black/8 focus-within:border-[#7C3AED]/40 transition-all px-4 py-3 shadow-sm">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKey}
            placeholder="Ask about availability, suggest a time…"
            rows={1}
            disabled={sending}
            className="flex-1 resize-none bg-transparent text-sm text-[#09090B] placeholder:text-[#A1A1AA] focus:outline-none leading-relaxed disabled:opacity-50"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#9333EA] flex items-center justify-center text-white shadow-sm hover:shadow-[0_4px_12px_rgba(124,58,237,0.35)] transition-all disabled:opacity-40 disabled:shadow-none hover:-translate-y-px"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 2L7 9M14 2L9.5 14l-2.5-5L2 6.5 14 2z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-[#A1A1AA] mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <AISparkle small />
        </div>
      )}

      <div className={`flex flex-col gap-2 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-gradient-to-br from-[#7C3AED] to-[#9333EA] text-white rounded-tr-sm shadow-[0_4px_12px_rgba(124,58,237,0.25)]'
              : 'bg-white border border-black/6 text-[#09090B] rounded-tl-sm shadow-sm'
          }`}
        >
          <FormattedText text={msg.content} isUser={isUser} />
        </div>

        {msg.suggestion && <SuggestionCard suggestion={msg.suggestion} />}
      </div>
    </div>
  )
}

function FormattedText({ text, isUser }: { text: string; isUser: boolean }) {
  // Render **bold** markdown
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className={isUser ? 'text-white' : 'text-[#09090B]'}>
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>
        )
      )}
    </>
  )
}

function SuggestionCard({ suggestion }: { suggestion: BookingSuggestion }) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-2xl p-4 w-full max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="#7C3AED" strokeWidth="1.2"/>
            <path d="M4 1v2M8 1v2M1 5h10" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-xs font-semibold text-[#7C3AED] uppercase tracking-wide">Suggested</span>
      </div>
      <p className="font-semibold text-[#09090B] text-sm">{suggestion.title}</p>
      {suggestion.datetime && (
        <p className="text-xs text-[#71717A] mt-1">{suggestion.datetime} · {suggestion.duration}</p>
      )}
      {suggestion.notes && (
        <p className="text-xs text-[#71717A] mt-1 leading-relaxed">{suggestion.notes}</p>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center flex-shrink-0 shadow-sm">
        <AISparkle small />
      </div>
      <div className="bg-white border border-black/6 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]"
            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
        <style>{`
          @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30% { transform: translateY(-4px); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}

function AISparkle({ small }: { small?: boolean }) {
  const size = small ? 14 : 18
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M9 1l1.8 5.4L16 9l-5.2 2.6L9 17l-1.8-5.4L2 9l5.2-2.6L9 1z" fill="white" fillOpacity="0.9"/>
    </svg>
  )
}
