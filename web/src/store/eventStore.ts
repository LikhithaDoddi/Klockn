// Zustand store for event state — organizer's active events and selected windows
// Keep server state (fetched data) in React Query; keep UI state here

import { create } from 'zustand'
import type { Event, TimeWindow } from '@klockn/shared'

interface EventStore {
  // The event the organizer is currently viewing/editing
  activeEvent: Event | null
  setActiveEvent: (event: Event | null) => void

  // The time window the organizer has selected (before confirming)
  selectedWindow: TimeWindow | null
  setSelectedWindow: (window: TimeWindow | null) => void
}

export const useEventStore = create<EventStore>((set) => ({
  activeEvent: null,
  setActiveEvent: (event) => set({ activeEvent: event }),

  selectedWindow: null,
  setSelectedWindow: (window) => set({ selectedWindow: window }),
}))
