'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { addDays, format, startOfWeek } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { KlocknMark } from '@/components/KlocknLogo'

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SAMPLE_BUSY = new Set([
  '0-9', '0-10', '1-11', '1-12', '1-13', '2-9', '3-14', '3-15', '4-10', '4-11',
])

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useSearchParams()

  const [step, setStep] = useState<'calendar' | 'invite'>('calendar')
  const [calendarStatus, setCalendarStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const [groupName, setGroupName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    const calendarConnected = params.get('calendar') === 'connected'
    api.get<{ success: boolean; data: { connected: boolean } }>('/api/v1/me/calendar')
      .then((r) => {
        if (r.data.data.connected || calendarConnected) {
          setCalendarStatus('connected')
          setStep('invite')
        } else {
          setCalendarStatus('disconnected')
        }
      })
      .catch(() => setCalendarStatus('disconnected'))
  }, [user, params])

  async function handleConnect() {
    setConnecting(true)
    setConnectError(null)
    try {
      const res = await api.get<{ success: boolean; data: { url: string } }>('/api/v1/calendar/google/connect', {
        params: { platform: 'web' },
      })
      window.location.href = res.data.data.url
    } catch {
      setConnectError('Could not start calendar connection. Try again.')
      setConnecting(false)
    }
  }

  async function handleInvite() {
    if (!groupName.trim() || !inviteEmail.trim()) return
    setSubmitting(true)
    setInviteError(null)
    try {
      const groupRes = await api.post<{ success: boolean; data: { id: string } }>('/api/v1/groups', {
        name: groupName.trim(),
      })
      await api.post(`/api/v1/groups/${groupRes.data.data.id}/invite`, {
        emails: [inviteEmail.trim()],
      })
      router.replace('/dashboard')
    } catch {
      setInviteError('Something went wrong. Try again or skip for now.')
      setSubmitting(false)
    }
  }

  if (loading || calendarStatus === 'loading') {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
      </div>
    )
  }

  const weekStart = startOfWeek(new Date())
  const days = Array.from({ length: 7 }, (_, i) => ({
    label: DAY_LABELS[addDays(weekStart, i).getDay()],
    idx: i,
  }))

  return (
    <div className="min-h-screen gradient-bg flex flex-col relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-150px] right-[-100px] w-[500px] h-[500px] rounded-full bg-purple-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-80px] w-[400px] h-[400px] rounded-full bg-violet-200/25 blur-3xl pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <KlocknMark size={28} />
          <span className="font-bold text-[#09090B]">klockn</span>
        </div>
        {/* Step dots */}
        <div className="flex items-center gap-2">
          {(['calendar', 'invite'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-all ${step === s ? 'bg-[#7C3AED] scale-125' : step === 'invite' && s === 'calendar' ? 'bg-[#10B981]' : 'bg-black/15'}`} />
              {i === 0 && <div className="w-8 h-px bg-black/10" />}
            </div>
          ))}
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        {step === 'calendar' ? (
          <div className="w-full max-w-lg fade-in-up flex flex-col gap-8">
            <div className="text-center flex flex-col gap-2">
              <p className="text-xs font-semibold text-[#7C3AED] uppercase tracking-widest">Step 1 of 2</p>
              <h1 className="text-2xl font-bold text-[#09090B] tracking-tight">
                Here's how your friends see you
              </h1>
              <p className="text-sm text-[#71717A] leading-relaxed">
                Only free or busy — your event titles and details stay completely private.
              </p>
            </div>

            {/* Free/busy preview */}
            <div className="glass-card rounded-3xl p-5 shadow-[0_8px_32px_rgba(124,58,237,0.1)]">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <div className="w-2 h-2 rounded-full bg-[#FEE2E2]" />
                </div>
                <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Preview — your calendar as others see it</span>
              </div>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex mb-1">
                    <div className="w-8 flex-shrink-0" />
                    {days.map((d) => (
                      <div key={d.idx} className="flex-1 min-w-[36px] flex flex-col items-center pb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#A1A1AA]">{d.label}</span>
                      </div>
                    ))}
                  </div>
                  {HOURS.map((hour) => (
                    <div key={hour} className="flex items-center">
                      <div className="w-8 flex-shrink-0 text-[10px] text-[#A1A1AA] text-right pr-2 font-medium">
                        {hour > 12 ? `${hour - 12}p` : `${hour}a`}
                      </div>
                      {days.map((d) => {
                        const busy = SAMPLE_BUSY.has(`${d.idx}-${hour}`)
                        return (
                          <div
                            key={d.idx}
                            className="flex-1 min-w-[36px] h-7 mx-0.5 my-px rounded-md transition-all"
                            style={{ backgroundColor: busy ? '#FEE2E2' : '#D1FAE5' }}
                          />
                        )
                      })}
                    </div>
                  ))}
                  <div className="flex items-center gap-4 mt-3 justify-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-[#D1FAE5]" />
                      <span className="text-xs text-[#71717A] font-medium">Free</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-[#FEE2E2]" />
                      <span className="text-xs text-[#71717A] font-medium">Busy</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {connectError && (
                <p className="text-sm text-red-600 text-center">{connectError}</p>
              )}
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
              <button
                onClick={() => router.replace('/dashboard')}
                className="w-full h-11 rounded-xl text-[#71717A] font-medium hover:text-[#09090B] transition-colors text-sm"
              >
                Skip for now
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md fade-in-up flex flex-col gap-7">
            <div className="text-center flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.35)]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#7C3AED] uppercase tracking-widest mb-1">Step 2 of 2</p>
                <h1 className="text-2xl font-bold text-[#09090B] tracking-tight">Calendar connected!</h1>
                <p className="text-sm text-[#71717A] mt-1.5 leading-relaxed">
                  Now invite someone — Klockn will find when you're both free.
                </p>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 shadow-[0_8px_32px_rgba(124,58,237,0.1)] flex flex-col gap-5">
              {inviteError && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{inviteError}</div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#09090B] uppercase tracking-wide">Group name</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Weekend crew, Work team…"
                  className="h-11 rounded-xl border-2 border-black/8 bg-white/80 px-4 text-sm focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all placeholder:text-[#A1A1AA]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#09090B] uppercase tracking-wide">Invite someone</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  placeholder="friend@example.com"
                  className="h-11 rounded-xl border-2 border-black/8 bg-white/80 px-4 text-sm focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all placeholder:text-[#A1A1AA]"
                />
              </div>

              <button
                onClick={handleInvite}
                disabled={submitting || !groupName.trim() || !inviteEmail.trim()}
                className="h-12 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-semibold hover:from-[#6D28D9] hover:to-[#7C3AED] transition-all shadow-[0_4px_16px_rgba(124,58,237,0.3)] disabled:opacity-50 text-sm"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Creating…
                  </span>
                ) : 'Create group & send invite'}
              </button>
            </div>

            <button
              onClick={() => router.replace('/dashboard')}
              className="text-sm text-[#71717A] hover:text-[#09090B] text-center transition-colors font-medium"
            >
              Skip — I'll invite people later
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
