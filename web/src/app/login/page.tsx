'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithGoogle, auth, resetPassword } from '@/lib/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { KlocknMark } from '@/components/KlocknLogo'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/onboarding')
  }, [user, loading, router])

  async function handleGoogle() {
    setError(null)
    setBusy(true)
    try {
      const result = await signInWithGoogle()
      await ensureProfile(result.user.displayName ?? '')
      router.replace('/onboarding')
    } catch (e) {
      const msg = friendlyError(e)
      if (msg) setError(msg)
    } finally {
      setBusy(false)
    }
  }

  async function handleEmail() {
    setError(null)
    if (!email.trim() || !password) return
    setBusy(true)
    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Please enter your name.'); setBusy(false); return }
        const { user: newUser } = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await updateProfile(newUser, { displayName: name.trim() })
        await ensureProfile(name.trim())
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
      router.replace('/onboarding')
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    if (!email.trim()) { setError('Enter your email address first.'); return }
    setError(null)
    setBusy(true)
    try {
      await resetPassword(email.trim())
      setResetSent(true)
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  async function ensureProfile(displayName: string) {
    try {
      await api.post('/api/v1/users', { name: displayName })
    } catch {
      // 409 = profile already exists
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-120px] right-[-120px] w-[480px] h-[480px] rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-[360px] h-[360px] rounded-full bg-violet-200/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm fade-in-up relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white border border-black/8 flex items-center justify-center shadow-[0_8px_32px_rgba(124,58,237,0.15)]">
            <KlocknMark size={44} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#09090B] tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Join Klockn'}
            </h1>
            <p className="text-sm text-[#71717A] mt-1">
              {mode === 'login' ? "Sign in to see when everyone's free" : 'Find the perfect time for everyone'}
            </p>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-7 shadow-[0_8px_32px_rgba(124,58,237,0.1)]">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                <circle cx="8" cy="8" r="7" stroke="#EF4444" strokeWidth="1.5"/>
                <path d="M8 5v3.5M8 11h.01" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border-2 border-black/8 bg-white hover:bg-gray-50/80 hover:border-black/12 hover:shadow-sm transition-all font-semibold text-[#09090B] disabled:opacity-50 text-sm"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
            <span className="text-xs text-[#71717A] font-medium">or</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
          </div>

          {mode === 'reset' ? (
            <div className="flex flex-col gap-4">
              {resetSent ? (
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[#09090B]">Check your email</p>
                  <p className="text-sm text-[#71717A]">We sent a reset link to <strong>{email}</strong></p>
                  <button
                    onClick={() => { setMode('login'); setResetSent(false) }}
                    className="text-sm font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors mt-1"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                        <circle cx="8" cy="8" r="7" stroke="#EF4444" strokeWidth="1.5"/>
                        <path d="M8 5v3.5M8 11h.01" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {error}
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#09090B] uppercase tracking-wide">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                      placeholder="you@example.com"
                      autoFocus
                      className="h-11 rounded-xl border-2 border-black/8 bg-white/80 px-4 text-sm focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all placeholder:text-[#A1A1AA]"
                    />
                  </div>
                  <button
                    onClick={handleReset}
                    disabled={busy}
                    className="h-12 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-semibold hover:from-[#6D28D9] hover:to-[#7C3AED] transition-all disabled:opacity-50 shadow-[0_4px_16px_rgba(124,58,237,0.3)] text-sm"
                  >
                    {busy ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Sending…
                      </span>
                    ) : 'Send reset link'}
                  </button>
                  <button
                    onClick={() => { setMode('login'); setError(null) }}
                    className="text-sm text-[#71717A] hover:text-[#09090B] transition-colors text-center font-medium"
                  >
                    Back to sign in
                  </button>
                </>
              )}
            </div>
          ) : (
          <div className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#09090B] uppercase tracking-wide">Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Johnson"
                  className="h-11 rounded-xl border-2 border-black/8 bg-white/80 px-4 text-sm focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all placeholder:text-[#A1A1AA]"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#09090B] uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
                placeholder="you@example.com"
                autoComplete="email"
                className="h-11 rounded-xl border-2 border-black/8 bg-white/80 px-4 text-sm focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all placeholder:text-[#A1A1AA]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#09090B] uppercase tracking-wide">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(null); setResetSent(false) }}
                    className="text-xs text-[#7C3AED] hover:text-[#6D28D9] font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
                placeholder="••••••••"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="h-11 rounded-xl border-2 border-black/8 bg-white/80 px-4 text-sm focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all placeholder:text-[#A1A1AA]"
              />
            </div>
            <button
              onClick={handleEmail}
              disabled={busy}
              className="h-12 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-semibold hover:from-[#6D28D9] hover:to-[#7C3AED] transition-all disabled:opacity-50 shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-px text-sm"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Please wait…
                </span>
              ) : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </div>
          )}
        </div>

        {mode !== 'reset' && (
          <p className="text-center text-sm text-[#71717A] mt-5">
            {mode === 'login' ? "New to Klockn? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
              className="font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
            >
              {mode === 'login' ? 'Create account' : 'Sign in'}
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.705c-.18-.54-.282-1.117-.282-1.705s.102-1.165.282-1.705V4.963H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.037l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.963L3.964 6.295C4.672 4.169 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

function friendlyError(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code: string }).code
    if (code === 'auth/email-already-in-use') return 'An account with this email already exists.'
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Incorrect email or password.'
    if (code === 'auth/weak-password') return 'Password must be at least 6 characters.'
    if (code === 'auth/invalid-email') return 'Please enter a valid email address.'
    if (code === 'auth/too-many-requests') return 'Too many attempts. Try again in a few minutes.'
    if (code === 'auth/popup-closed-by-user') return ''
    if (code === 'auth/unauthorized-domain') return 'This domain is not authorised. Please contact support.'
    if (code === 'auth/popup-blocked') return 'Popup blocked — please allow popups for this site and try again.'
    if (code === 'auth/cancelled-popup-request') return ''
  }
  return 'Something went wrong. Please try again.'
}
