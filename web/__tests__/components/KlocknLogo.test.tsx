import React from 'react'
import { render } from '@testing-library/react'
import { KlocknMark, KlocknWordmark } from '@/components/KlocknLogo'

describe('KlocknMark', () => {
  it('renders an SVG with the default size', () => {
    const { container } = render(<KlocknMark />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '32')
    expect(svg).toHaveAttribute('height', '32')
  })

  it('renders with a custom size', () => {
    const { container } = render(<KlocknMark size={48} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '48')
    expect(svg).toHaveAttribute('height', '48')
  })
})

describe('KlocknWordmark', () => {
  it('renders the logo mark and wordmark text', () => {
    const { container, getByText } = render(<KlocknWordmark />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(getByText('klockn')).toBeInTheDocument()
  })
})
