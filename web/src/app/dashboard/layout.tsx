'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { signOutUser } from '@/lib/firebase'
import { KlocknMark } from '@/components/KlocknLogo'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-[3px] border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
          <p className="text-sm text-[#71717A]">Loading…</p>
        </div>
      </div>
    )
  }

  const initials = user.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? '?'

  const navLinks = [
    { href: '/dashboard', label: 'Groups' },
    { href: '/dashboard/calendar', label: 'Calendar' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7FF]">
      <nav className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-black/6 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <KlocknMark size={28} />
              <span className="text-base font-bold text-[#09090B] tracking-tight">klockn</span>
            </Link>
            <div className="flex items-center gap-1">
              {navLinks.map((link) => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-purple-50 text-[#7C3AED]'
                        : 'text-[#71717A] hover:text-[#09090B] hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {initials}
              </div>
              <span className="text-sm font-medium text-[#09090B] hidden sm:block">
                {user.displayName ?? user.email?.split('@')[0]}
              </span>
            </div>
            <button
              onClick={() => signOutUser().then(() => router.replace('/login'))}
              className="text-xs text-[#71717A] hover:text-[#09090B] transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  )
}
