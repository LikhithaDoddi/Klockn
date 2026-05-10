'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface Group {
  id: string
  name: string
  memberCount: number
  createdAt: string
}

const GROUP_COLORS = [
  'from-[#7C3AED] to-[#A78BFA]',
  'from-[#F97316] to-[#FBBF24]',
  'from-[#10B981] to-[#34D399]',
  'from-[#3B82F6] to-[#60A5FA]',
  'from-[#EC4899] to-[#F472B6]',
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await api.get<{ success: boolean; data: Group[] }>('/api/v1/groups')
      setGroups(res.data.data)
    } catch {
      setError('Could not load groups.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const firstName = user?.displayName?.split(' ')[0] ?? 'there'

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-[#71717A] font-medium mb-1">Hey, {firstName}</p>
          <h1 className="text-3xl font-bold text-[#09090B] tracking-tight">Your groups</h1>
        </div>
        <Link
          href="/dashboard/groups/create"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white text-sm font-semibold hover:from-[#6D28D9] hover:to-[#7C3AED] transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-px"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          New group
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="h-24 rounded-2xl shimmer" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-[#71717A]">{error}</p>
          <button onClick={load} className="text-sm font-semibold text-[#7C3AED] hover:underline">Retry</button>
        </div>
      ) : groups.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g, i) => (
            <button
              key={g.id}
              onClick={() => router.push(`/dashboard/groups/${g.id}`)}
              className="group flex items-center gap-4 bg-white rounded-2xl border border-black/6 p-5 text-left hover:border-[#7C3AED]/25 hover:shadow-[0_4px_20px_rgba(124,58,237,0.1)] transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${GROUP_COLORS[i % GROUP_COLORS.length]} flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm`}>
                {g.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#09090B] truncate">{g.name}</p>
                <p className="text-xs text-[#71717A] mt-0.5">
                  {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#D4D4D8] group-hover:text-[#7C3AED] transition-colors flex-shrink-0">
                <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>
      )}

      <CalendarBanner />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-5 py-20 text-center">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-purple-50 flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M18 8a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM8 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
            <path d="M28 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM34 26a6 6 0 0 0-6-6" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"/>
            <path d="M8 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 26a6 6 0 0 1 6-6" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#7C3AED] flex items-center justify-center shadow-md">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M1 5h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <div className="flex flex-col gap-2 max-w-xs">
        <h2 className="text-lg font-bold text-[#09090B]">No groups yet</h2>
        <p className="text-sm text-[#71717A] leading-relaxed">
          Create a group, invite your people, and Klockn will find when everyone is free.
        </p>
      </div>
      <Link
        href="/dashboard/groups/create"
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white text-sm font-semibold hover:from-[#6D28D9] hover:to-[#7C3AED] transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)] hover:-translate-y-px"
      >
        Create your first group
      </Link>
    </div>
  )
}

function CalendarBanner() {
  const [status, setStatus] = useState<{ connected: boolean } | null>(null)

  useEffect(() => {
    api.get<{ success: boolean; data: { connected: boolean } }>('/api/v1/me/calendar')
      .then((r) => setStatus(r.data.data))
      .catch(() => {})
  }, [])

  if (!status || status.connected) return null

  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100 rounded-2xl px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="4" width="16" height="14" rx="2" stroke="#7C3AED" strokeWidth="1.5"/>
            <path d="M6 2v4M14 2v4M2 9h16" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="font-semibold text-[#7C3AED] text-sm">Connect Google Calendar</p>
          <p className="text-xs text-purple-400 mt-0.5">So your group can see when you're free</p>
        </div>
      </div>
      <Link
        href="/dashboard/calendar"
        className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9] transition-colors shadow-sm flex-shrink-0"
      >
        Connect
      </Link>
    </div>
  )
}
