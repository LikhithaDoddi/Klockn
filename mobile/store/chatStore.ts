import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  bookingSuggestion?: BookingSuggestion
}

export interface BookingSuggestion {
  windowStart: string
  windowEnd: string
  label: string
}

interface ChatState {
  messages: Record<string, ChatMessage[]>
  addMessage: (groupId: string, message: ChatMessage) => void
  clearMessages: (groupId: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: {},
  addMessage: (groupId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [groupId]: [...(s.messages[groupId] ?? []), message],
      },
    })),
  clearMessages: (groupId) =>
    set((s) => ({
      messages: { ...s.messages, [groupId]: [] },
    })),
}))
