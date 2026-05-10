'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { addDays, format, startOfWeek, isToday } from 'date-fns'
import { api } from '@/lib/api'

interface Slot { date: string; hour: number; free: boolean }

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function hourLabel(h: number) {
  if (h === 12) return '12 pm'
  if (h > 12) return `${h - 12} pm`
  return `${h} am`
}

export default function CalendarPage() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [calEmail, setCalEmail] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const statusRes = await api.get<{ success: boolean; data: { connected: boolean; email: string | null } }>('/api/v1/me/calendar')
      setConnected(statusRes.data.data.connected)
      setCalEmail(statusRes.data.data.email)
      if (statusRes.data.data.connected) {
        const slotsRes = await api.get<{ success: boolean; data: Slot[] }>('/api/v1/me/availability', {
          params: { weekStart },
        })
        setSlots(slotsRes.data.data)
      }
    } catch {
      setError('Could not load calendar status.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    try {
      const res = await api.get<{ success: boolean; data: { url: string } }>('/api/v1/calendar/google/connect', {
        params: { platform: 'web' },
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
      {/* Illustration */}
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center shadow-sm">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="8" width="40" height="36" rx="4" stroke="#7C3AED" strokeWidth="2"/>
            <path d="M14 4v8M34 4v8M4 20h40" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
            <rect x="12" y="26" width="8" height="6" rx="1.5" fill="#A78BFA"/>
            <rect x="24" y="26" width="8" height="6" rx="1.5" fill="#10B981"/>
            <rect x="28" y="34" width="8" height="6" rx="1.5" fill="#A78BFA"/>
          </svg>
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white border-2 border-purple-100 flex items-center justify-center shadow-sm">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 4v4l3 3" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="8" r="6.5" stroke="#7C3AED" strokeWidth="1.5"/>
          </svg>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-[#09090B] tracking-tight">Connect your calendar</h1>
        <p className="text-sm text-[#71717A] leading-relaxed">
          Klockn reads your Google Calendar to show your free/busy times to your group.
          <span className="block mt-1.5 font-medium text-[#09090B]/70">No event titles or details are ever shared.</span>
        </p>
      </div>

      {/* Privacy badges */}
      <div className="flex gap-3 flex-wrap justify-center">
        {[
          { icon: '🔒', label: 'Read-only access' },
          { icon: '🙈', label: 'No event details' },
          { icon: '❌', label: 'Cancel anytime' },
        ].map((b) => (
          <div key={b.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-black/8 text-xs font-medium text-[#71717A] shadow-sm">
            <span>{b.icon}</span>
            {b.label}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleConnect}
        disabled={connecting}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-semibold hover:from-[#6D28D9] hover:to-[#7C3AED] transition-all shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_24px_rgba(124,58,237,0.4)] hover:-translate-y-px disabled:opacity-50 text-sm"
      >
        {connecting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Redirecting to Google…
          </span>
        ) : 'Connect Google Calendar'}
      </button>
    </div>
  )

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(weekStart + 'T00:00:00'), i)
    return {
      label: DAY_LABELS[d.getDay()],
      date: format(d, 'yyyy-MM-dd'),
      num: format(d, 'd'),
      isToday: isToday(d),
    }
  })

  const freeSet = new Set(slots.filter((s) => s.free).map((s) => `${s.date}-${s.hour}`))
  const busySet = new Set(slots.filter((s) => !s.free).map((s) => `${s.date}-${s.hour}`))
  const freeCount = freeSet.size
  const busyCount = busySet.size
  const totalTracked = freeCount + busyCount

  return (
    <div className="flex flex-col gap-6 fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#09090B] tracking-tight">Your calendar</h1>
          {calEmail && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#10B981]" />
              <p className="text-sm text-[#71717A]">{calEmail}</p>
            </div>
          )}
        </div>
        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-green-50 text-green-700 font-semibold border border-green-100">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Connected
        </span>
      </div>

      {/* Stats row */}
      {totalTracked > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Free slots', value: freeCount, color: 'text-[#10B981]', bg: 'bg-green-50' },
            { label: 'Busy slots', value: busyCount, color: 'text-[#F97316]', bg: 'bg-orange-50' },
            { label: 'This week', value: `${Math.round((freeCount / (totalTracked || 1)) * 100)}% free`, color: 'text-[#7C3AED]', bg: 'bg-purple-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-black/4`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[#71717A] mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white rounded-3xl border border-black/6 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-black/6 flex items-center justify-between">
          <h2 className="font-semibold text-[#09090B] text-sm">This week — how others see you</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#D1FAE5]" />
              <span className="text-xs text-[#71717A] font-medium">Free</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#FEE2E2]" />
              <span className="text-xs text-[#71717A] font-medium">Busy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#F4F4F5]" />
              <span className="text-xs text-[#71717A] font-medium">No data</span>
            </div>
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Day headers */}
            <div className="flex mb-2">
              <div className="w-12 flex-shrink-0" />
              {days.map((d) => (
                <div key={d.date} className="flex-1 min-w-[44px] flex flex-col items-center gap-1 pb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${d.isToday ? 'text-[#7C3AED]' : 'text-[#A1A1AA]'}`}>
                    {d.label}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    d.isToday
                      ? 'bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] text-white shadow-[0_4px_12px_rgba(124,58,237,0.3)]'
                      : 'text-[#09090B]'
                  }`}>
                    {d.num}
                  </div>
                </div>
              ))}
            </div>

            {/* Hour rows */}
            {HOURS.map((hour) => (
              <div key={hour} className="flex items-center">
                <div className="w-12 flex-shrink-0 text-[10px] text-[#A1A1AA] text-right pr-3 font-medium">
                  {hourLabel(hour)}
                </div>
                {days.map((d) => {
                  const key = `${d.date}-${hour}`
                  const isFree = freeSet.has(key)
                  const isBusy = busySet.has(key)
                  return (
                    <div
                      key={d.date}
                      className="flex-1 min-w-[44px] h-9 mx-0.5 my-px rounded-md transition-all hover:opacity-80"
                      style={{
                        backgroundColor: isFree ? '#D1FAE5' : isBusy ? '#FEE2E2' : '#F4F4F5',
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Privacy note */}
      <p className="text-xs text-center text-[#A1A1AA]">
        Your group members only see free/busy — no event titles, descriptions, or details are ever shared.
      </p>
    </div>
  )
}
