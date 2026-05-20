'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useState } from 'react'
import { addDays, format, isToday, parseISO, startOfWeek } from 'date-fns'
import { api } from '@/lib/api'

interface BusyPeriod { date: string; startMinute: number; endMinute: number }
interface CalendarItem { id: string; name: string; primary: boolean; color: string }
interface Segment { type: 'free' | 'busy'; pct: number; exactLabel?: string }

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DISPLAY_HOURS = Array.from({ length: 14 }, (_, i) => i + 7)
const ROW_PX = 52

const FREE_PHRASES = [
  'wide open', 'free!', 'all yours', 'open', 'grab me',
  'ping me', 'book it', "let's go", 'available', 'free window',
  'catch up?', 'your call', 'open slot', 'reach out', "let's talk",
  'schedule it', 'free zone', "I'm free", 'now?', "let's meet",
  'open door', 'holler', 'call me', 'come find me', 'why not?',
]

const FREE_COLORS = [
  { bg: '#F0FDF4', border: 'rgba(16,185,129,0.35)', text: '#059669' },
  { bg: '#FFFBEB', border: 'rgba(245,158,11,0.35)', text: '#B45309' },
  { bg: '#F0F9FF', border: 'rgba(14,165,233,0.35)', text: '#0369A1' },
  { bg: '#FFF1F2', border: 'rgba(244,63,94,0.35)', text: '#BE123C' },
  { bg: '#F5F3FF', border: 'rgba(124,58,237,0.25)', text: '#6D28D9' },
]

function freeStyle(dayIdx: number, hourIdx: number, segIdx: number) {
  const c = (dayIdx * 7 + hourIdx * 3 + segIdx * 2) % FREE_COLORS.length
  const p = (dayIdx * 13 + hourIdx * 7 + segIdx * 3) % FREE_PHRASES.length
  return { color: FREE_COLORS[c], phrase: FREE_PHRASES[p] }
}

function fmtMinute(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return min === 0 ? `${h12}${ampm}` : `${h12}:${String(min).padStart(2, '0')}${ampm}`
}

function hourLabel(h: number) {
  if (h === 12) return '12pm'
  return h > 12 ? `${h - 12}pm` : `${h}am`
}

function getSegments(date: string, hour: number, busyPeriods: BusyPeriod[]): Segment[] {
  const cellStart = hour * 60
  const cellEnd = (hour + 1) * 60
  const relevant = busyPeriods
    .filter(p => p.date === date && p.startMinute < cellEnd && p.endMinute > cellStart)
    .sort((a, b) => a.startMinute - b.startMinute)
  if (relevant.length === 0) return [{ type: 'free', pct: 1 }]
  const segs: Segment[] = []
  let cursor = cellStart
  for (const p of relevant) {
    const busyStart = Math.max(p.startMinute, cellStart)
    const busyEnd = Math.min(p.endMinute, cellEnd)
    if (busyStart > cursor) segs.push({ type: 'free', pct: (busyStart - cursor) / 60 })
    let exactLabel: string | undefined
    if (p.startMinute % 60 !== 0 || p.endMinute % 60 !== 0) {
      exactLabel = `${fmtMinute(p.startMinute)}-${fmtMinute(p.endMinute)}`
    }
    segs.push({ type: 'busy', pct: (busyEnd - busyStart) / 60, exactLabel })
    cursor = busyEnd
  }
  if (cursor < cellEnd) segs.push({ type: 'free', pct: (cellEnd - cursor) / 60 })
  return segs
}

export default function CalendarPage() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [calEmail, setCalEmail] = useState<string | null>(null)
  const [busyPeriods, setBusyPeriods] = useState<BusyPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [savingCalendars, setSavingCalendars] = useState(false)
  const [showCalendarPicker, setShowCalendarPicker] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const weekStart = format(
    (() => { const d = startOfWeek(new Date()); d.setDate(d.getDate() + weekOffset * 7); return d })(),
    'yyyy-MM-dd'
  )
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(parseISO(weekStart), i)
    return {
      label: DAY_LABELS[d.getDay()],
      date: format(d, 'yyyy-MM-dd'),
      num: format(d, 'd'),
      isToday: isToday(d),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    }
  })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const statusRes = await api.get<{
        success: boolean
        data: { connected: boolean; email: string | null; selectedCalendarIds: string[] | null }
      }>('/api/v1/me/calendar')
      setConnected(statusRes.data.data.connected)
      setCalEmail(statusRes.data.data.email)
      if (statusRes.data.data.connected) {
        const [slotsRes, calsRes] = await Promise.all([
          api.get<{ success: boolean; data: { busyPeriods: BusyPeriod[] } }>('/api/v1/me/availability', {
            params: { weekStart, timezone: tz },
          }),
          api.get<{ success: boolean; data: { calendars: CalendarItem[]; selectedIds: string[] | null } }>('/api/v1/me/calendars'),
        ])
        setBusyPeriods(slotsRes.data.data.busyPeriods)
        const cals = calsRes.data.data.calendars
        setCalendars(cals)
        const saved = calsRes.data.data.selectedIds
        setSelectedIds(new Set(saved ?? cals.map(c => c.id)))
      }
    } catch {
      setError('Could not load calendar.')
    } finally {
      setLoading(false)
    }
  }, [weekStart, tz])

  useEffect(() => { load() }, [load])

  async function saveCalendarSelection(ids: Set<string>) {
    setSavingCalendars(true)
    try {
      await api.patch('/api/v1/me/calendars', { selectedIds: Array.from(ids) })
      const slotsRes = await api.get<{ success: boolean; data: { busyPeriods: BusyPeriod[] } }>('/api/v1/me/availability', {
        params: { weekStart, timezone: tz },
      })
      setBusyPeriods(slotsRes.data.data.busyPeriods)
    } catch {
      setError('Could not save calendar selection.')
    } finally {
      setSavingCalendars(false)
    }
  }

  function toggleCalendar(id: string) {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  async function handleConnect() {
    setConnecting(true); setError(null)
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
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center shadow-sm">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="8" width="40" height="36" rx="4" stroke="#7C3AED" strokeWidth="2"/>
          <path d="M14 4v8M34 4v8M4 20h40" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
          <rect x="12" y="26" width="8" height="6" rx="1.5" fill="#A78BFA"/>
          <rect x="24" y="26" width="8" height="6" rx="1.5" fill="#10B981"/>
        </svg>
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-[#09090B] tracking-tight">Connect your calendar</h1>
        <p className="text-sm text-[#71717A] leading-relaxed">
          Klockn reads your Google Calendar to show your free/busy times to your group.
          <span className="block mt-1.5 font-medium text-[#09090B]/70">No event titles or details are ever shared.</span>
        </p>
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        {['Read-only access', 'No event details', 'Cancel anytime'].map(l => (
          <div key={l} className="px-3 py-1.5 bg-white rounded-full border border-black/8 text-xs font-medium text-[#71717A] shadow-sm">{l}</div>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={handleConnect} disabled={connecting}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-semibold transition-all shadow-[0_4px_16px_rgba(124,58,237,0.3)] disabled:opacity-50 text-sm">
        {connecting
          ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Redirecting...</span>
          : 'Connect Google Calendar'}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#09090B] tracking-tight">Your calendar</h1>
          {calEmail && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#10B981]" />
              <p className="text-sm text-[#71717A]">{calEmail}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCalendarPicker(v => !v)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-purple-50 text-[#7C3AED] font-semibold border border-purple-100 hover:bg-purple-100 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="currentColor"/>
              <rect x="7" y="1" width="4" height="4" rx="1" fill="currentColor" fillOpacity="0.5"/>
              <rect x="1" y="7" width="4" height="4" rx="1" fill="currentColor" fillOpacity="0.5"/>
              <rect x="7" y="7" width="4" height="4" rx="1" fill="currentColor"/>
            </svg>
            {selectedIds.size} calendar{selectedIds.size !== 1 ? 's' : ''}
          </button>
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-green-50 text-green-700 font-semibold border border-green-100">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Connected
          </span>
        </div>
      </div>

      {showCalendarPicker && calendars.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/8 p-5 flex flex-col gap-3 shadow-sm">
          <div>
            <p className="font-semibold text-[#09090B] text-sm">Which calendars count as busy?</p>
            <p className="text-xs text-[#71717A] mt-0.5">Selected calendars show as busy to your groups.</p>
          </div>
          <div className="flex flex-col divide-y divide-black/5">
            {calendars.map(cal => (
              <label key={cal.id} className="flex items-center gap-3 py-2.5 cursor-pointer">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                <span className="flex-1 text-sm text-[#09090B]">
                  {cal.name}{cal.primary && <span className="ml-1.5 text-xs text-[#71717A]">(primary)</span>}
                </span>
                <input type="checkbox" checked={selectedIds.has(cal.id)} onChange={() => toggleCalendar(cal.id)} className="w-4 h-4 rounded accent-[#7C3AED]" />
              </label>
            ))}
          </div>
          <button onClick={() => { saveCalendarSelection(selectedIds); setShowCalendarPicker(false) }}
            disabled={savingCalendars || selectedIds.size === 0}
            className="h-10 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white text-sm font-semibold disabled:opacity-50">
            {savingCalendars ? 'Saving...' : 'Save selection'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-black/6 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)}
              className="w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center text-[#71717A] hover:bg-[#EDE9FE] hover:text-[#7C3AED] transition-colors font-bold text-base">
              ‹
            </button>
            <button onClick={() => setWeekOffset(0)}
              className={`px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${weekOffset === 0 ? 'bg-[#7C3AED] text-white' : 'bg-[#F4F4F5] text-[#71717A] hover:bg-[#EDE9FE] hover:text-[#7C3AED]'}`}>
              Today
            </button>
            <button onClick={() => setWeekOffset(w => w + 1)}
              className="w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center text-[#71717A] hover:bg-[#EDE9FE] hover:text-[#7C3AED] transition-colors font-bold text-base">
              ›
            </button>
            <span className="text-sm font-semibold text-[#09090B] ml-1">
              {format(parseISO(weekStart), 'MMM d')} – {format(addDays(parseISO(weekStart), 6), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#111]" />
              <span className="text-xs text-[#71717A] font-medium">Busy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#F0FDF4] border border-[rgba(16,185,129,0.35)]" />
              <span className="text-xs text-[#71717A] font-medium">Free</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, minmax(72px, 1fr))' }}>
            <div style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,0.05)' }} />
            {days.map(d => (
              <div key={d.date} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '12px 4px 10px',
                borderLeft: '1px solid rgba(0,0,0,0.04)',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                background: '#FAFAFA',
                opacity: d.isWeekend ? 0.45 : 1,
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: d.isToday ? '#7C3AED' : '#A1A1AA' }}>
                  {d.label}
                </span>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', marginTop: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800,
                  background: d.isToday ? '#7C3AED' : 'transparent',
                  color: d.isToday ? 'white' : '#09090B',
                  boxShadow: d.isToday ? '0 4px 12px rgba(124,58,237,0.4)' : 'none',
                }}>
                  {d.num}
                </div>
              </div>
            ))}

            {DISPLAY_HOURS.map((hour, hourIdx) => (
              <>
                <div key={`lbl-${hour}`} style={{
                  height: ROW_PX, borderRight: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                  paddingRight: 10, paddingTop: 6,
                  fontSize: 10, color: '#D4D4D8', fontWeight: 600,
                }}>
                  {hourLabel(hour)}
                </div>
                {days.map((d, dayIdx) => {
                  const segments = getSegments(d.date, hour, busyPeriods)
                  let topPx = 2
                  return (
                    <div key={`${d.date}-${hour}`} style={{
                      height: ROW_PX, position: 'relative',
                      borderLeft: '1px solid rgba(0,0,0,0.04)',
                      borderTop: '1px solid rgba(0,0,0,0.03)',
                      background: d.isWeekend ? 'rgba(0,0,0,0.012)' : 'white',
                    }}>
                      {segments.map((seg, segIdx) => {
                        const height = Math.max(seg.pct * (ROW_PX - 4), 4)
                        const top = topPx
                        topPx += height
                        if (seg.type === 'busy') {
                          return (
                            <div key={segIdx} style={{
                              position: 'absolute', top, left: 3, right: 3, height,
                              borderRadius: 7, background: '#111', zIndex: 2,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                              overflow: 'hidden',
                            }}>
                              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 9px)' }} />
                              {height > 16 && <span style={{ fontSize: 11, position: 'relative', zIndex: 1 }}>🔒</span>}
                              {height > 26 && <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', position: 'relative', zIndex: 1 }}>busy</span>}
                              {seg.exactLabel && (
                                <span style={{ position: 'absolute', bottom: 3, right: 5, fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.3)', zIndex: 1 }}>{seg.exactLabel}</span>
                              )}
                            </div>
                          )
                        }
                        const { color, phrase } = freeStyle(dayIdx, hourIdx, segIdx)
                        return (
                          <div key={segIdx} style={{
                            position: 'absolute', top, left: 3, right: 3, height,
                            borderRadius: 7, background: color.bg, border: `1.5px dashed ${color.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 1, cursor: 'pointer', overflow: 'hidden',
                            transition: 'transform 0.1s, box-shadow 0.1s',
                          }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'scale(1.02)'; el.style.boxShadow = '0 3px 10px rgba(0,0,0,0.08)' }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'scale(1)'; el.style.boxShadow = 'none' }}>
                            {height > 18 && (
                              <span style={{ fontSize: 9, fontWeight: 800, color: color.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 6px' }}>
                                {phrase}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-[#A1A1AA]">
        Your group members only see free/busy — no event titles, descriptions, or details are ever shared.
      </p>
    </div>
  )
}
