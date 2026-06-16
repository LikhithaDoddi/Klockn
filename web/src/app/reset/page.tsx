'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { KlocknMark } from '@/components/KlocknLogo'

export default function ResetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
      </div>
    }>
      <ResetContent />
    </Suspense>
  )
}

function ResetContent() {
  const searchParams = useSearchParams()
  const oobCode = searchParams.get('oobCode')

  const [status, setStatus] = useState<'verifying' | 'ready' | 'invalid' | 'done'>('verifying')
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!oobCode) {
      setStatus('invalid')
      return
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((mail) => {
        setEmail(mail)
        setStatus('ready')
      })
      .catch(() => setStatus('invalid'))
  }, [oobCode])

  async function handleSubmit() {
    if (!oobCode) return
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await confirmPasswordReset(auth, oobCode, password)
      setStatus('done')
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
      if (code === 'auth/expired-action-code') {
        setStatus('invalid')
      } else if (code === 'auth/invalid-action-code') {
        setStatus('invalid')
      } else if (code === 'auth/weak-password') {
        setError('Please choose a stronger password.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setSubmitting(false)
    }
  }

  if (status === 'verifying') {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="1.5" />
              <path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#09090B]">Link expired or invalid</h1>
          <p className="text-sm text-[#71717A]">
            This password reset link has expired or has already been used. Request a new one from the app.
          </p>
          <a href="/login" className="text-[#7C3AED] text-sm font-medium hover:underline">Back to sign in</a>
        </div>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center flex flex-col items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center shadow-sm">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-[#09090B]">Password updated</h1>
            <p className="text-sm text-[#71717A] leading-relaxed">
              Your password has been reset. You can now sign in with your new password.
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
        <div className="flex items-center justify-center gap-2 mb-8">
          <KlocknMark size={30} />
          <span className="text-lg font-bold text-[#09090B]">klockn</span>
        </div>

        <div className="glass-card rounded-3xl p-8 shadow-[0_8px_32px_rgba(124,58,237,0.1)] flex flex-col gap-5">
          <div className="flex flex-col gap-1.5 text-center">
            <h1 className="text-2xl font-bold text-[#09090B] tracking-tight">Choose a new password</h1>
            {email && <p className="text-sm text-[#71717A]">for {email}</p>}
          </div>

          <div className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              className="w-full h-12 px-4 rounded-xl bg-white/70 border border-black/10 text-[#09090B] text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full h-12 px-4 rounded-xl bg-white/70 border border-black/10 text-[#09090B] text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-semibold hover:from-[#6D28D9] hover:to-[#7C3AED] transition-all shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_24px_rgba(124,58,237,0.4)] hover:-translate-y-px disabled:opacity-50 text-sm"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Updating…
              </span>
            ) : 'Reset password'}
          </button>

          <p className="text-xs text-[#A1A1AA] text-center">
            Remembered it?{' '}
            <a href="/login" className="text-[#7C3AED] font-medium hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
