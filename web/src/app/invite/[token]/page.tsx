'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { KlocknMark } from '@/components/KlocknLogo'

interface InviteDetails {
  memberId: string
  email: string
  name: string | null
  status: string
  groupName: string
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}

function InviteContent() {
  const { token } = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ success: boolean; data: InviteDetails }>(`/api/v1/invite/${token}`)
      .then((res) => {
        setInvite(res.data.data)
        if (res.data.data.status === 'calendar_connected' || searchParams.get('connected') === 'true') {
          setConnected(true)
        }
      })
      .catch(() => setError('This invite link is invalid or has expired.'))
      .finally(() => setLoading(false))
  }, [token, searchParams])

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    try {
      const res = await api.get<{ success: boolean; data: { url: string } }>(
        `/api/v1/invite/${token}/connect-calendar`,
        { params: { platform: 'web' } }
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

  if (connected) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center flex flex-col items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center shadow-sm">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-[#09090B]">You're all set!</h1>
            <p className="text-sm text-[#71717A] leading-relaxed">
              Your calendar is connected. <strong>{invite?.groupName}</strong> can now see when you're free.
              Your event details stay private — only free/busy is shared.
            </p>
          </div>
          <a
            href="/login"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white text-sm font-semibold hover:from-[#6D28D9] hover:to-[#7C3AED] transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
          >
            Open Klockn
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full bg-violet-200/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm fade-in-up relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <KlocknMark size={30} />
          <span className="text-lg font-bold text-[#09090B]">klockn</span>
        </div>

        <div className="glass-card rounded-3xl p-8 shadow-[0_8px_32px_rgba(124,58,237,0.1)] flex flex-col items-center gap-5 text-center">
          {/* Group icon */}
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

          {/* Privacy badges */}
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
            ) : 'Connect Google Calendar'}
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
