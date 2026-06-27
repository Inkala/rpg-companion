import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the Hunin app shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument()
    expect(screen.getByText('Your party companion.')).toBeInTheDocument()
  })
})
