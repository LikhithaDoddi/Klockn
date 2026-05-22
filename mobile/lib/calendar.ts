import * as WebBrowser from 'expo-web-browser'
import { api } from './api'

export interface BusyPeriod {
  date: string        // 'YYYY-MM-DD' in user's local timezone
  startMinute: number // minutes from midnight
  endMinute: number
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
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const res = await api.get<{ success: boolean; data: { url: string } }>(
    '/api/v1/calendar/google/connect',
    { params: { platform: 'mobile', tz } }
  )
  const { url } = res.data.data
  const result = await WebBrowser.openAuthSessionAsync(url, 'klockn://calendar/callback')
  return result.type === 'success'
}

// Returns true if an hour slot (hour=9 → 9:00–10:00) overlaps any busy period on that date
export function isHourBusy(date: string, hour: number, busyPeriods: BusyPeriod[]): boolean {
  const slotStart = hour * 60
  const slotEnd = slotStart + 60
  return busyPeriods.some(
    (p) => p.date === date && p.startMinute < slotEnd && p.endMinute > slotStart
  )
}

export async function getMyAvailability(weekStart: string): Promise<BusyPeriod[]> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const res = await api.get<{ success: boolean; data: { busyPeriods: BusyPeriod[] } }>(
    '/api/v1/me/availability',
    { params: { weekStart, timezone: tz } }
  )
  return res.data.data.busyPeriods
}
