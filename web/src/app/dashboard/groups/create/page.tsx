'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function CreateGroupPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleCreate() {
    if (!name.trim()) return
    setError(null)
    setLoading(true)
    try {
      const res = await api.post<{ success: boolean; data: { id: string } }>('/api/v1/groups', { name: name.trim() })
      router.push(`/dashboard/groups/${res.data.data.id}`)
    } catch {
      setError('Could not create group. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md">
      <button onClick={() => router.back()} className="text-sm text-[#71717A] hover:text-[#09090B] mb-6 flex items-center gap-1">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-[#09090B] mb-1">New group</h1>
      <p className="text-sm text-[#71717A] mb-8">Give your group a name. You can invite members after creating it.</p>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#09090B]">Group name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. Weekend crew, Work team"
            maxLength={60}
            autoFocus
            className="h-12 rounded-xl border-2 border-black/10 px-4 text-base focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="h-12 rounded-xl bg-[#7C3AED] text-white font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create group'}
        </button>
        <button
          onClick={() => router.back()}
          className="h-12 rounded-xl text-[#71717A] font-semibold hover:text-[#09090B] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
