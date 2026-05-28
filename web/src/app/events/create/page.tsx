'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateEventPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard') }, [router])
  return null
}
