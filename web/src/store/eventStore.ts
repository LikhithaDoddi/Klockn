import { create } from 'zustand'

interface Event { id: string; title: string; status: string }
interface TimeWindow { start: string; end: string }

interface EventStore {
  activeEvent: Event | null
  setActiveEvent: (event: Event | null) => void
  selectedWindow: TimeWindow | null
  setSelectedWindow: (window: TimeWindow | null) => void
}

export const useEventStore = create<EventStore>((set) => ({
  activeEvent: null,
  setActiveEvent: (event) => set({ activeEvent: event }),
  selectedWindow: null,
  setSelectedWindow: (window) => set({ selectedWindow: window }),
}))
