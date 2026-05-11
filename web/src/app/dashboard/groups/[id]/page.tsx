'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { addDays, format, startOfWeek } from 'date-fns'
import { api } from '@/lib/api'

interface MemberSlot { date: string; hour: number; free: boolean }
interface Member { id: string; name: string | null; email: string; status: string; availability: MemberSlot[] }
interface GroupDetail { id: string; name: string; members: Member[] }

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MEMBER_COLORS = ['#7C3AED', '#F97316', '#10B981', '#3B82F6', '#EC4899', '#F59E0B']

export default function GroupPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd')

  const load = useCallback(async (silent = false) => {
    if (!silent) setError(null)
    try {
      const res = await api.get<{ success: boolean; data: GroupDetail }>(`/api/v1/groups/${id}`, {
        params: { weekStart },
      })
      setGroup(res.data.data)
    } catch {
      if (!silent) setError('Could not load group.')
    } finally {
      setLoading(false)
    }
  }, [id, weekStart])

  useEffect(() => {
    load()
    pollRef.current = setInterval(() => load(true), 30_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [load])

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    try {
      await api.post(`/api/v1/groups/${id}/invite`, { emails: [inviteEmail.trim()] })
      setInviteMsg(`Invite sent to ${inviteEmail.trim()}`)
      setInviteEmail('')
      load()
    } catch {
      setInviteMsg('Could not send invite. Check the email and try again.')
    } finally {
      setInviting(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-[#7C3AED] border-t-transparent animate-spin" />
    </div>
  )

  if (error || !group) return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-[#71717A]">{error ?? 'Group not found.'}</p>
      <button onClick={() => load()} className="text-sm font-semibold text-[#7C3AED] hover:underline">Retry</button>
    </div>
  )

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(weekStart + 'T00:00:00'), i)
    return { label: DAY_LABELS[d.getDay()], date: format(d, 'yyyy-MM-dd'), num: format(d, 'd') }
  })
  const today = format(new Date(), 'yyyy-MM-dd')

  function allFree(date: string, hour: number) {
    if (group!.members.length === 0) return false
    return group!.members.every((m) => m.availability.some((s) => s.date === date && s.hour === hour && s.free))
  }
  function freeCount(date: string, hour: number) {
    return group!.members.filter((m) => m.availability.some((s) => s.date === date && s.hour === hour && s.free)).length
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-[#71717A] hover:text-[#09090B]">← Back</button>
        <h1 className="text-2xl font-bold text-[#09090B] flex-1">{group.name}</h1>
        <button
          onClick={() => router.push(`/dashboard/groups/${id}/chat`)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white text-sm font-semibold hover:from-[#6D28D9] hover:to-[#7C3AED] transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)] hover:-translate-y-px"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1l1.26 3.78L12 7l-3.74 1.82L7 13l-1.26-3.78L2 7l3.74-1.82L7 1z" fill="white" fillOpacity="0.9"/>
          </svg>
          Ask AI
        </button>
      </div>

      {/* Invite */}
      <div className="bg-white rounded-2xl border border-black/8 p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-[#09090B]">Invite someone</h2>
        <div className="flex gap-2">
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            placeholder="friend@example.com"
            type="email"
            className="flex-1 h-11 rounded-xl border-2 border-black/10 px-4 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="px-4 h-11 rounded-xl bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
          >
            {inviting ? 'Sending…' : 'Send invite'}
          </button>
        </div>
        {inviteMsg && <p className="text-sm text-[#71717A]">{inviteMsg}</p>}
      </div>

      {/* Members */}
      <div className="bg-white rounded-2xl border border-black/8 p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-[#09090B]">Members ({group.members.length})</h2>
        {group.members.length === 0 ? (
          <p className="text-sm text-[#71717A]">No members yet. Invite someone above.</p>
        ) : (
          <div className="flex flex-col divide-y divide-black/5">
            {group.members.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                >
                  {(m.name ?? m.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#09090B] truncate">{m.name ?? m.email}</p>
                  {m.name && <p className="text-xs text-[#71717A] truncate">{m.email}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  m.status === 'calendar_connected'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-[#71717A]'
                }`}>
                  {m.status === 'calendar_connected' ? 'Calendar connected' : 'Invited'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Availability grid */}
      <div className="bg-white rounded-2xl border border-black/8 p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-[#09090B]">This week's availability</h2>
          <p className="text-xs text-[#71717A] mt-0.5">Green = everyone is free</p>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header */}
            <div className="flex">
              <div className="w-10 flex-shrink-0" />
              {days.map((d) => (
                <div key={d.date} className="flex-1 min-w-[40px] flex flex-col items-center gap-1 pb-2">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${d.date === today ? 'text-[#7C3AED]' : 'text-[#71717A]'}`}>
                    {d.label}
                  </span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    d.date === today ? 'bg-[#7C3AED] text-white' : 'text-[#09090B]'
                  }`}>
                    {d.num}
                  </div>
                </div>
              ))}
            </div>

            {/* Hour rows */}
            {HOURS.map((hour) => (
              <div key={hour} className="flex items-center">
                <div className="w-10 flex-shrink-0 text-[10px] text-[#71717A] text-right pr-2">
                  {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`}
                </div>
                {days.map((d) => {
                  const everyone = allFree(d.date, hour)
                  const count = freeCount(d.date, hour)
                  const ratio = group.members.length > 0 ? count / group.members.length : 0
                  return (
                    <div
                      key={d.date}
                      className="flex-1 min-w-[40px] h-8 mx-0.5 my-0.5 rounded"
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

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 justify-center">
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
    </div>
  )
}
