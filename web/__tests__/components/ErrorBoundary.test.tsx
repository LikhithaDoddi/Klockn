import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error')
  return <div>All good</div>
}

// Suppress console.error from React's error boundary logging
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  jest.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('renders the fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Reload the page to continue.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('reload button is clickable and labelled correctly', async () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    const btn = screen.getByRole('button', { name: 'Reload' })
    expect(btn).toBeEnabled()
    // Click without asserting reload (jsdom doesn't support navigation)
    await userEvent.click(btn)
  })
})
