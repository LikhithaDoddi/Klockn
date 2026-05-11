import * as WebBrowser from 'expo-web-browser'
import { api } from './api'

export interface AvailabilitySlot {
  date: string       // 'YYYY-MM-DD'
  hour: number       // 0–23
  free: boolean
}

export interface CalendarStatus {
  connected: boolean
  email: string | null
}

export async function getCalendarStatus(): Promise<CalendarStatus> {
  const res = await api.get<{ success: boolean; data: CalendarStatus }>('/api/v1/me/calendar')
  return res.data.data
}

export async function connectGoogleCalendar(): Promise<boolean> {
  const res = await api.get<{ success: boolean; data: { url: string } }>('/api/v1/calendar/google/connect')
  const { url } = res.data.data

  const result = await WebBrowser.openAuthSessionAsync(url, 'klockn://calendar/callback')
  return result.type === 'success'
}

export async function getMyAvailability(weekStart: string): Promise<AvailabilitySlot[]> {
  const res = await api.get<{ success: boolean; data: AvailabilitySlot[] }>(
    '/api/v1/me/availability',
    { params: { weekStart } }
  )
  return res.data.data
}
