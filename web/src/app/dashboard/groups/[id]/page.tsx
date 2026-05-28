'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { addDays, format, isToday, parseISO, startOfWeek } from 'date-fns'
import { api } from '@/lib/api'

interface MemberSlot { date: string; hour: number; free: boolean }
interface Member { id: string; name: string | null; email: string; status: string; availability: MemberSlot[] }
interface GroupDetail { id: string; name: string; members: Member[] }

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MEMBER_COLORS = ['#7C3AED', '#F97316', '#10B981', '#3B82F6', '#EC4899', '#F59E0B']
const ROW_PX = 52

function hourLabel(h: number) {
  if (h === 12) return '12pm'
  return h > 12 ? `${h - 12}pm` : `${h}am`
}

export default function GroupPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const weekStart = format(
    (() => { const d = startOfWeek(new Date()); d.setDate(d.getDate() + weekOffset * 7); return d })(),
    'yyyy-MM-dd'
  )

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

  async function handleRemoveMember(memberId: string, memberLabel: string) {
    if (!confirm(`Remove ${memberLabel} from this group?`)) return
    setRemovingId(memberId)
    try {
      await api.delete(`/api/v1/groups/${id}/members/${memberId}`)
      load()
    } catch {
      // silently reload — member list will reflect current state
    } finally {
      setRemovingId(null)
    }
  }

  async function handleDeleteGroup() {
    if (!confirm(`Delete "${group?.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await api.delete(`/api/v1/groups/${id}`)
      router.push('/dashboard')
    } catch {
      setDeleting(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    try {
      const res = await api.post<{ success: boolean; data: { invited: unknown[]; emailWarning?: string } }>(
        `/api/v1/groups/${id}/invite`,
        { emails: [inviteEmail.trim()] }
      )
      const { invited, emailWarning } = res.data.data
      if (invited.length === 0) {
        setInviteMsg(`${inviteEmail.trim()} is already in this group.`)
      } else if (emailWarning) {
        setInviteMsg(`Member added but the invite email could not be sent. Check back later.`)
      } else {
        setInviteMsg(`Invite sent to ${inviteEmail.trim()}`)
      }
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
      <div className="w-8 h-8 rounded-full border-[3px] border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
    </div>
  )

  if (error || !group) return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-[#71717A]">{error ?? 'Group not found.'}</p>
      <button onClick={() => load()} className="text-sm font-semibold text-[#7C3AED] hover:underline">Retry</button>
    </div>
  )

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(parseISO(weekStart + 'T00:00:00'), i)
    return {
      label: DAY_LABELS[d.getDay()],
      date: format(d, 'yyyy-MM-dd'),
      num: format(d, 'd'),
      isToday: isToday(d),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    }
  })

  // Only members who've connected their calendar have real availability data
  const connectedMembers = group.members.filter(m => m.status === 'calendar_connected')

  function allFree(date: string, hour: number) {
    if (connectedMembers.length === 0) return false
    return connectedMembers.every(m => m.availability.some(s => s.date === date && s.hour === hour && s.free))
  }

  function freeCount(date: string, hour: number) {
    return connectedMembers.filter(m => m.availability.some(s => s.date === date && s.hour === hour && s.free)).length
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-[#71717A] hover:text-[#09090B]">← Back</button>
        <h1 className="text-2xl font-bold text-[#09090B] flex-1">{group.name}</h1>
        <button
          onClick={handleDeleteGroup}
          disabled={deleting}
          className="px-3 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete group'}
        </button>
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
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#09090B]">Invite someone</h2>
          <button
            onClick={async () => {
              const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://klockn.com'
              await navigator.clipboard.writeText(`${base}/join/group/${id}`)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 text-xs font-medium text-[#71717A] hover:text-[#09090B] hover:border-black/20 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M2 10V2h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {copied ? 'Copied!' : 'Copy invite link'}
          </button>
        </div>
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
        {inviteMsg && (
          <p className={`text-sm font-medium ${
            inviteMsg.startsWith('Invite sent') ? 'text-green-600' :
            inviteMsg.includes('already') ? 'text-[#71717A]' :
            'text-amber-600'
          }`}>{inviteMsg}</p>
        )}
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
                <button
                  onClick={() => handleRemoveMember(m.id, m.name ?? m.email)}
                  disabled={removingId === m.id}
                  className="ml-1 p-1.5 rounded-lg text-[#A1A1AA] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  title="Remove member"
                >
                  {removingId === m.id ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" className="animate-spin" fill="none">
                      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 8"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Availability grid */}
      <div className="bg-white rounded-3xl border border-black/6 overflow-hidden shadow-sm">
        {/* Top bar */}
        <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center text-[#71717A] hover:bg-[#EDE9FE] hover:text-[#7C3AED] transition-colors font-bold text-base"
            >‹</button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${weekOffset === 0 ? 'bg-[#7C3AED] text-white' : 'bg-[#F4F4F5] text-[#71717A] hover:bg-[#EDE9FE] hover:text-[#7C3AED]'}`}
            >Today</button>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center text-[#71717A] hover:bg-[#EDE9FE] hover:text-[#7C3AED] transition-colors font-bold text-base"
            >›</button>
            <span className="text-sm font-semibold text-[#09090B] ml-1">
              {format(parseISO(weekStart), 'MMM d')} – {format(addDays(parseISO(weekStart), 6), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {connectedMembers.length === 0 ? (
              <span className="text-xs text-[#A1A1AA]">No calendars connected yet</span>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#10B981]" />
                  <span className="text-xs text-[#71717A] font-medium">All free</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#A78BFA]" />
                  <span className="text-xs text-[#71717A] font-medium">Some free</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#111]" />
                  <span className="text-xs text-[#71717A] font-medium">All busy</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, minmax(72px, 1fr))' }}>
            {/* Corner */}
            <div style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,0.05)' }} />

            {/* Day headers */}
            {days.map(d => (
              <div key={d.date} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '12px 4px 10px',
                borderLeft: '1px solid rgba(0,0,0,0.04)',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                background: '#FAFAFA',
                opacity: d.isWeekend ? 0.45 : 1,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.6px', color: d.isToday ? '#7C3AED' : '#A1A1AA',
                }}>
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

            {/* Hour rows */}
            {HOURS.map((hour) => (
              <>
                <div key={`lbl-${hour}`} style={{
                  height: ROW_PX,
                  borderRight: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                  paddingRight: 10, paddingTop: 6,
                  fontSize: 10, color: '#D4D4D8', fontWeight: 600,
                }}>
                  {hourLabel(hour)}
                </div>
                {days.map((d) => {
                  const everyone = allFree(d.date, hour)
                  const count = freeCount(d.date, hour)
                  const total = connectedMembers.length
                  const ratio = total > 0 ? count / total : 0
                  const allBusy = total > 0 && count === 0

                  let bg = '#F4F4F5'
                  let border = 'none'
                  let content = null

                  if (total === 0) {
                    bg = d.isWeekend ? 'rgba(0,0,0,0.012)' : 'white'
                  } else if (everyone) {
                    bg = '#F0FDF4'
                    border = '1.5px dashed rgba(16,185,129,0.45)'
                    content = (
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#059669', whiteSpace: 'nowrap', padding: '0 6px' }}>
                        Everyone free
                      </span>
                    )
                  } else if (allBusy) {
                    bg = '#111'
                    content = (
                      <>
                        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 9px)', borderRadius: 7 }} />
                        <span style={{ fontSize: 11, position: 'relative', zIndex: 1 }}>🔒</span>
                      </>
                    )
                  } else if (count > 0) {
                    bg = `rgba(167,139,250,${0.15 + ratio * 0.55})`
                    content = (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#6D28D9', whiteSpace: 'nowrap', padding: '0 6px' }}>
                        {count}/{total} free
                      </span>
                    )
                  }

                  return (
                    <div key={d.date} style={{
                      height: ROW_PX, position: 'relative',
                      borderLeft: '1px solid rgba(0,0,0,0.04)',
                      borderTop: '1px solid rgba(0,0,0,0.03)',
                      background: d.isWeekend && total === 0 ? 'rgba(0,0,0,0.012)' : 'white',
                    }}>
                      <div style={{
                        position: 'absolute', top: 3, left: 3, right: 3, bottom: 3,
                        borderRadius: 7,
                        background: bg,
                        border,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        {content}
                      </div>
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-[#A1A1AA]">
        Availability is based on {connectedMembers.length} of {group.members.length} member{group.members.length !== 1 ? 's' : ''} with connected calendars.
      </p>
    </div>
  )
}
