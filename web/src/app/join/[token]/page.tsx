'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { addDays, format, startOfWeek } from 'date-fns'
import { api } from '@/lib/api'
import { KlocknMark } from '@/components/KlocknLogo'

interface MemberSlot { date: string; hour: number; free: boolean }
interface AvailabilityMember { id: string; availability: MemberSlot[] }

interface InviteDetails {
  memberId: string
  email: string
  name: string | null
  status: string
  groupName: string
  groupId: string
}

interface GroupAvailability {
  groupName: string
  memberCount: number
  availability: AvailabilityMember[]
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function JoinTokenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
      </div>
    }>
      <JoinTokenContent />
    </Suspense>
  )
}

function JoinTokenContent() {
  const { token } = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [joined, setJoined] = useState(false)
  const [groupAvailability, setGroupAvailability] = useState<GroupAvailability | null>(null)
  const [error, setError] = useState<string | null>(null)

  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd')

  useEffect(() => {
    api.get<{ success: boolean; data: InviteDetails }>(`/api/v1/invite/${token}`)
      .then(async (res) => {
        const inv = res.data.data
        setInvite(inv)
        const isJoined = inv.status === 'calendar_connected' || searchParams.get('joined') === 'true'
        if (isJoined) {
          setJoined(true)
          try {
            const avRes = await api.get<{ success: boolean; data: GroupAvailability }>(
              `/api/v1/groups/${inv.groupId}/availability`,
              { params: { weekStart } }
            )
            setGroupAvailability(avRes.data.data)
          } catch {
            // availability is best-effort — grid just won't show
          }
        }
      })
      .catch(() => setError('This invite link is invalid or has expired.'))
      .finally(() => setLoading(false))
  }, [token, searchParams, weekStart])

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    try {
      const res = await api.get<{ success: boolean; data: { url: string } }>(
        `/api/v1/invite/${token}/connect-calendar`,
        { params: { platform: 'web', source: 'join' } }
      )
      window.location.href = res.data.data.url
    } catch {
      setError('Could not start calendar connection. Please try again.')
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="1.5"/>
              <path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#09090B]">Link not found</h1>
          <p className="text-sm text-[#71717A]">{error}</p>
        </div>
      </div>
    )
  }

  if (joined) {
    return (
      <PostJoinScreen
        groupName={groupAvailability?.groupName ?? invite?.groupName ?? ''}
        memberCount={groupAvailability?.memberCount}
        availability={groupAvailability?.availability}
        weekStart={weekStart}
      />
    )
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full bg-violet-200/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm fade-in-up relative z-10">
        <div className="flex items-center justify-center gap-2 mb-8">
          <KlocknMark size={30} />
          <span className="text-lg font-bold text-[#09090B]">klockn</span>
        </div>

        <div className="glass-card rounded-3xl p-8 shadow-[0_8px_32px_rgba(124,58,237,0.1)] flex flex-col items-center gap-5 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-white text-3xl font-black shadow-[0_8px_24px_rgba(124,58,237,0.35)]">
            {invite?.groupName?.[0]?.toUpperCase() ?? 'K'}
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-[#71717A] font-medium">You've been invited to</p>
            <h1 className="text-2xl font-bold text-[#09090B] tracking-tight">{invite?.groupName}</h1>
          </div>

          <p className="text-sm text-[#71717A] leading-relaxed">
            Connect your Google Calendar so the group can see when you're free.
            <span className="block mt-1 font-medium text-[#09090B]/70">No event titles or details are ever shared.</span>
          </p>

          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { icon: '🔒', label: 'Read-only' },
              { icon: '🙈', label: 'No event details' },
              { icon: '❌', label: 'Cancel anytime' },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 rounded-full border border-black/8 text-xs font-medium text-[#71717A]">
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
            ) : 'Connect Google Calendar to join'}
          </button>

          <p className="text-xs text-[#A1A1AA]">
            Already on Klockn?{' '}
            <a href="/login" className="text-[#7C3AED] font-medium hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}

function PostJoinScreen({ groupName, memberCount, availability, weekStart }: {
  groupName: string
  memberCount?: number
  availability?: AvailabilityMember[]
  weekStart: string
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(weekStart + 'T00:00:00'), i)
    return { label: DAY_LABELS[d.getDay()], date: format(d, 'yyyy-MM-dd'), num: format(d, 'd') }
  })
  const today = format(new Date(), 'yyyy-MM-dd')
  const members = availability ?? []

  function allFree(date: string, hour: number) {
    if (members.length === 0) return false
    return members.every((m) => m.availability.some((s) => s.date === date && s.hour === hour && s.free))
  }
  function freeCount(date: string, hour: number) {
    return members.filter((m) => m.availability.some((s) => s.date === date && s.hour === hour && s.free)).length
  }

  return (
    <div className="min-h-screen gradient-bg px-4 py-10 relative overflow-hidden">
      <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full bg-violet-200/30 blur-3xl pointer-events-none" />

      <div className="max-w-xl mx-auto fade-in-up relative z-10 flex flex-col gap-6">
        <div className="flex items-center justify-center gap-2">
          <KlocknMark size={28} />
          <span className="text-base font-bold text-[#09090B]">klockn</span>
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-[0_8px_32px_rgba(124,58,237,0.1)] flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#09090B]">You're in!</h1>
          <p className="text-sm text-[#71717A]">
            Here's when <strong>{groupName}</strong> is free this week.
            {memberCount != null && ` ${memberCount} member${memberCount !== 1 ? 's' : ''} connected.`}
          </p>
        </div>

        {members.length > 0 ? (
          <div className="bg-white rounded-2xl border border-black/8 p-5 flex flex-col gap-4">
            <div>
              <h2 className="font-semibold text-[#09090B] text-sm">This week's availability</h2>
              <p className="text-xs text-[#71717A] mt-0.5">Green = everyone is free</p>
            </div>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex">
                  <div className="w-10 flex-shrink-0" />
                  {days.map((d) => (
                    <div key={d.date} className="flex-1 min-w-[36px] flex flex-col items-center gap-1 pb-2">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${d.date === today ? 'text-[#7C3AED]' : 'text-[#71717A]'}`}>
                        {d.label}
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                        d.date === today ? 'bg-[#7C3AED] text-white' : 'text-[#09090B]'
                      }`}>
                        {d.num}
                      </div>
                    </div>
                  ))}
                </div>
                {HOURS.map((hour) => (
                  <div key={hour} className="flex items-center">
                    <div className="w-10 flex-shrink-0 text-[10px] text-[#71717A] text-right pr-2">
                      {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`}
                    </div>
                    {days.map((d) => {
                      const everyone = allFree(d.date, hour)
                      const count = freeCount(d.date, hour)
                      const ratio = members.length > 0 ? count / members.length : 0
                      return (
                        <div
                          key={d.date}
                          className="flex-1 min-w-[36px] h-7 mx-0.5 my-0.5 rounded"
                          style={{
                            backgroundColor: everyone
                              ? '#10B981'
                              : count > 0
                                ? `rgba(167,139,250,${0.2 + ratio * 0.6})`
                                : '#F4F4F5',
                          }}
                        />
                      )
                    })}
                  </div>
                ))}
                <div className="flex items-center gap-4 mt-3 justify-center">
                  {[
                    { color: '#10B981', label: 'All free' },
                    { color: '#A78BFA', label: 'Some free' },
                    { color: '#F4F4F5', label: 'All busy' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                      <span className="text-xs text-[#71717A]">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black/8 p-6 text-center">
            <p className="text-sm text-[#71717A]">Availability will appear once more members connect their calendars.</p>
          </div>
        )}

        <div className="glass-card rounded-2xl p-5 flex flex-col gap-3 text-center">
          <p className="text-sm font-medium text-[#09090B]">Get notified when your group finds a time</p>
          <p className="text-xs text-[#71717A]">Create a free account to receive alerts and manage your groups.</p>
          <a
            href="/login"
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-semibold hover:from-[#6D28D9] hover:to-[#7C3AED] transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)] text-sm flex items-center justify-center"
          >
            Create your Klockn account
          </a>
          <p className="text-xs text-[#A1A1AA]">Free forever. No credit card needed.</p>
        </div>
      </div>
    </div>
  )
}
