'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''

interface WaitlistEntry {
  id: string
  email: string
  name: string | null
  source: string
  created_at: string
}

export default function WaitlistPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user || user.email !== ADMIN_EMAIL) {
      router.replace('/dashboard')
      return
    }

    api.get<{ success: boolean; data: WaitlistEntry[] }>('/api/v1/waitlist')
      .then((res) => setEntries(res.data.data))
      .catch(() => setError('Could not load waitlist.'))
      .finally(() => setFetching(false))
  }, [user, loading, router])

  function exportCSV() {
    const header = 'email,name,source,signed_up'
    const rows = entries.map((e) =>
      [e.email, e.name ?? '', e.source, new Date(e.created_at).toISOString()].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'klockn-waitlist.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-[3px] border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 p-4">{error}</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#09090B]">Waitlist</h1>
          <p className="text-sm text-[#71717A] mt-0.5">{entries.length} {entries.length === 1 ? 'person' : 'people'} signed up</p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={exportCSV}
            className="px-4 py-2 text-sm font-medium bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors"
          >
            Export CSV
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-black/6 p-12 text-center">
          <p className="text-[#71717A] text-sm">No signups yet. Share your landing page.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-black/6 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/6 bg-gray-50/60">
                <th className="text-left px-5 py-3 font-medium text-[#71717A]">Email</th>
                <th className="text-left px-5 py-3 font-medium text-[#71717A]">Name</th>
                <th className="text-left px-5 py-3 font-medium text-[#71717A]">Source</th>
                <th className="text-left px-5 py-3 font-medium text-[#71717A]">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr
                  key={e.id}
                  className={`${i !== entries.length - 1 ? 'border-b border-black/4' : ''} hover:bg-purple-50/30 transition-colors`}
                >
                  <td className="px-5 py-3 text-[#09090B] font-medium">{e.email}</td>
                  <td className="px-5 py-3 text-[#71717A]">{e.name ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-[#7C3AED]">
                      {e.source}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#71717A]">
                    {new Date(e.created_at).toLocaleDateString('en-CA', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
