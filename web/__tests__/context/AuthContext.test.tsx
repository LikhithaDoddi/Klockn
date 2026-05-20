import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/context/AuthContext'

let mockOnIdTokenChanged: (cb: (user: unknown) => void) => () => void

jest.mock('@/lib/firebase', () => ({
  auth: {},
  onIdTokenChanged: (auth: unknown, cb: (user: unknown) => void) => {
    mockOnIdTokenChanged = (_cb) => { cb(_cb as unknown); return () => {} }
    mockOnIdTokenChanged(null)
    return () => {}
  },
}))

function TestConsumer() {
  const { user, loading } = useAuth()
  if (loading) return <div>Loading</div>
  return <div>{user ? 'Logged in' : 'Logged out'}</div>
}

describe('AuthContext', () => {
  it('starts in loading state', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    // After mock fires, loading becomes false
    expect(screen.getByText('Logged out')).toBeInTheDocument()
  })

  it('provides user: null when not authenticated', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    expect(screen.getByText('Logged out')).toBeInTheDocument()
  })
})
