'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { addDays, format, startOfWeek, isToday, subWeeks, addWeeks } from 'date-fns'
import { api } from '@/lib/api'

interface Slot { date: string; time: string; free: boolean }
interface CalendarItem { id: string; name: string; primary: boolean; color: string }

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

function timeLabel(time: string) {
  const [h, m] = time.split(':').map(Number)
  if (m === 30) return ''
  if (h === 0) return '12 am'
  if (h === 12) return '12 pm'
  return h > 12 ? `${h - 12} pm` : `${h} am`
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><div className="w-10 h-10 rounded-full border-[3px] border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" /></div>}>
      <CalendarContent />
    </Suspense>
  )
}

function CalendarContent() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [calEmail, setCalEmail] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [savingCalendars, setSavingCalendars] = useState(false)
  const [showCalendarPicker, setShowCalendarPicker] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  const baseWeek = startOfWeek(new Date())
  const weekStart = format(addWeeks(baseWeek, weekOffset), 'yyyy-MM-dd')
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  useEffect(() => { load() }, [searchParams, weekOffset])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const statusRes = await api.get<{ success: boolean; data: { connected: boolean; email: string | null; selectedCalendarIds: string[] | null } }>('/api/v1/me/calendar')
      setConnected(statusRes.data.data.connected)
      setCalEmail(statusRes.data.data.email)
      if (statusRes.data.data.connected) {
        const [slotsRes, calsRes] = await Promise.all([
          api.get<{ success: boolean; data: Slot[] }>('/api/v1/me/availability', {
            params: { weekStart, timezone: tz },
          }),
          api.get<{ success: boolean; data: { calendars: CalendarItem[]; selectedIds: string[] | null } }>('/api/v1/me/calendars'),
        ])
        setSlots(slotsRes.data.data)
        const cals = calsRes.data.data.calendars
        setCalendars(cals)
        const saved = calsRes.data.data.selectedIds
        setSelectedIds(new Set(saved ?? cals.map((c) => c.id)))
      }
    } catch {
      setError('Could not load calendar status.')
    } finally {
      setLoading(false)
    }
  }

  async function saveCalendarSelection(ids: Set<string>) {
    setSavingCalendars(true)
    try {
      await api.patch('/api/v1/me/calendars', { selectedIds: Array.from(ids) })
      const slotsRes = await api.get<{ success: boolean; data: Slot[] }>('/api/v1/me/availability', {
        params: { weekStart, timezone: tz },
      })
      setSlots(slotsRes.data.data)
    } catch {
      setError('Could not save calendar selection.')
    } finally {
      setSavingCalendars(false)
    }
  }

  function toggleCalendar(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) { next.delete(id) } else { next.add(id) }
    setSelectedIds(next)
  }

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    try {
      const res = await api.get<{ success: boolean; data: { url: string } }>('/api/v1/calendar/google/connect', {
        params: { platform: 'web', returnTo: 'dashboard' },
      })
      window.location.href = res.data.data.url
    } catch {
      setError('Could not start calendar connection. Try again.')
      setConnecting(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-10 h-10 rounded-full border-[3px] border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
    </div>
  )

  if (!connected) return (
    <div className="flex flex-col items-center gap-8 py-16 text-center max-w-md mx-auto">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center shadow-sm">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="8" width="40" height="36" rx="4" stroke="#7C3AED" strokeWidth="2"/>
          <path d="M14 4v8M34 4v8M4 20h40" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
          <rect x="12" y="26" width="8" height="6" rx="1.5" fill="#A78BFA"/>
          <rect x="24" y="26" width="8" height="6" rx="1.5" fill="#10B981"/>
        </svg>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-[#09090B] tracking-tight">Connect your calendar</h1>
        <p className="text-sm text-[#71717A] leading-relaxed">
          Klockn reads your Google Calendar to show your free/busy times.
          <span className="block mt-1.5 font-medium text-[#09090B]/70">No event titles or details are ever shared.</span>
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={handleConnect} disabled={connecting}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-semibold hover:from-[#6D28D9] hover:to-[#7C3AED] transition-all shadow-[0_4px_16px_rgba(124,58,237,0.3)] disabled:opacity-50 text-sm">
        {connecting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Redirecting…</span> : 'Connect Google Calendar'}
      </button>
    </div>
  )

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(weekStart + 'T00:00:00'), i)
    return { label: DAY_LABELS[d.getDay()], date: format(d, 'yyyy-MM-dd'), num: format(d, 'd'), today: isToday(d) }
  })

  const slotMap = new Map(slots.map((s) => [`${s.date}-${s.time}`, s.free]))

  const weekLabel = (() => {
    const start = addDays(new Date(weekStart + 'T00:00:00'), 0)
    const end = addDays(start, 6)
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
  })()

  return (
    <div className="flex flex-col gap-6 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#09090B] tracking-tight">Your availability</h1>
          {calEmail && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#10B981]" />
              <p className="text-xs text-[#71717A]">{calEmail}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleConnect} disabled={connecting}
            className="text-xs px-3 py-1.5 rounded-full border border-black/10 text-[#71717A] hover:text-[#09090B] hover:border-black/20 transition-all font-medium">
            Reconnect
          </button>
          <button onClick={() => setShowCalendarPicker((v) => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${showCalendarPicker ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'bg-purple-50 text-[#7C3AED] border-purple-100 hover:bg-purple-100'}`}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="currentColor"/>
              <rect x="7" y="1" width="4" height="4" rx="1" fill="currentColor" fillOpacity="0.5"/>
              <rect x="1" y="7" width="4" height="4" rx="1" fill="currentColor" fillOpacity="0.5"/>
              <rect x="7" y="7" width="4" height="4" rx="1" fill="currentColor"/>
            </svg>
            {selectedIds.size} calendar{selectedIds.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Calendar picker */}
      {showCalendarPicker && calendars.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/8 p-5 flex flex-col gap-3 shadow-sm">
          <div>
            <p className="font-semibold text-[#09090B] text-sm">Which calendars count as busy?</p>
            <p className="text-xs text-[#71717A] mt-0.5">Includes shared calendars and accepted invites from others.</p>
          </div>
          <div className="flex flex-col divide-y divide-black/5">
            {calendars.map((cal) => (
              <label key={cal.id} className="flex items-center gap-3 py-2.5 cursor-pointer">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                <span className="flex-1 text-sm text-[#09090B]">
                  {cal.name}
                  {cal.primary && <span className="ml-1.5 text-xs text-[#71717A]">(primary)</span>}
                </span>
                <input type="checkbox" checked={selectedIds.has(cal.id)} onChange={() => toggleCalendar(cal.id)}
                  className="w-4 h-4 rounded accent-[#7C3AED]" />
              </label>
            ))}
          </div>
          <button onClick={() => { saveCalendarSelection(selectedIds); setShowCalendarPicker(false) }}
            disabled={savingCalendars || selectedIds.size === 0}
            className="h-10 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white text-sm font-semibold hover:from-[#6D28D9] hover:to-[#7C3AED] transition-all disabled:opacity-50">
            {savingCalendars ? 'Saving…' : 'Save & refresh'}
          </button>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset((w) => w - 1)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/8 text-sm font-medium text-[#71717A] hover:text-[#09090B] hover:border-black/20 transition-all">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Prev
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#09090B]">{weekLabel}</span>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)}
              className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-[#7C3AED] font-medium hover:bg-purple-100 transition-colors">
              Today
            </button>
          )}
        </div>
        <button onClick={() => setWeekOffset((w) => w + 1)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/8 text-sm font-medium text-[#71717A] hover:text-[#09090B] hover:border-black/20 transition-all">
          Next
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-black/8 overflow-hidden shadow-sm">
        {/* Day headers */}
        <div className="grid border-b border-black/6" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
          <div className="py-3" />
          {days.map((d) => (
            <div key={d.date} className="py-3 flex flex-col items-center gap-1 border-l border-black/5">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${d.today ? 'text-[#7C3AED]' : 'text-[#A1A1AA]'}`}>
                {d.label}
              </span>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                d.today ? 'bg-[#7C3AED] text-white' : 'text-[#09090B]'
              }`}>
                {d.num}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="overflow-y-auto max-h-[600px]">
          {HALF_HOURS.map((time) => {
            const isHour = time.endsWith(':00')
            return (
              <div key={time} className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
                <div className={`pr-3 flex items-start justify-end pt-0.5 ${isHour ? 'h-8' : 'h-6'}`}>
                  {isHour && (
                    <span className="text-[9px] text-[#A1A1AA] font-medium whitespace-nowrap">
                      {timeLabel(time)}
                    </span>
                  )}
                </div>
                {days.map((d) => {
                  const free = slotMap.get(`${d.date}-${time}`)
                  const isBusy = free === false
                  return (
                    <div key={d.date}
                      className={`border-l border-black/5 ${isHour ? 'h-8 border-t border-black/5' : 'h-6'} ${
                        isBusy ? 'bg-[#EDE9FE]' : free === true ? '' : ''
                      }`}
                    >
                      {isBusy && (
                        <div className="mx-0.5 h-full rounded-sm bg-[#7C3AED]/20 border-l-2 border-[#7C3AED]" />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#EDE9FE] border-l-2 border-[#7C3AED]" />
          <span className="text-xs text-[#71717A] font-medium">Busy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-white border border-black/8" />
          <span className="text-xs text-[#71717A] font-medium">Free</span>
        </div>
      </div>

      <p className="text-xs text-center text-[#A1A1AA]">
        Your group members only see free/busy — no event titles or details are ever shared.
      </p>
    </div>
  )
}
