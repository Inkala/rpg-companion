import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

function openCharacterReference() {
  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: 'Explore Mara' }))
}

describe('App', () => {
  it('renders the guest landing page', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Hunin' })).toBeInTheDocument()
    expect(screen.getByText('Your party companion.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Create, bring in, and understand a character without decoding the whole sheet.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Explore Mara' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Create a character/ }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByRole('button', { name: /Add an existing character/ }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: /Sign in/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(
      screen.getByRole('button', { name: /I have a party invite/ }),
    ).toHaveAttribute('aria-disabled', 'true')
  })

  it('opens Character Reference from Explore Mara', () => {
    openCharacterReference()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Character Reference' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mara Vale' })).toBeInTheDocument()
    expect(screen.getByText('Human Ranger · Level 3')).toBeInTheDocument()
  })

  it('starts with Actions expanded', () => {
    openCharacterReference()

    expect(screen.getByRole('button', { name: /Actions, 2 items/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('button', { name: /Longbow/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Shortsword/ })).toBeInTheDocument()
  })

  it('expands Features on request', () => {
    openCharacterReference()

    const featuresHeader = screen.getByRole('button', {
      name: /Features, 2 items/,
    })

    expect(featuresHeader).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: /Colossus Slayer/ })).not.toBeInTheDocument()

    fireEvent.click(featuresHeader)

    expect(featuresHeader).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Archery/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Colossus Slayer/ })).toBeInTheDocument()
  })

  it('opens the Colossus Slayer sheet', () => {
    openCharacterReference()
    fireEvent.click(screen.getByRole('button', { name: /Features, 2 items/ }))

    fireEvent.click(screen.getByRole('button', { name: /Colossus Slayer/ }))

    const sheet = screen.getByRole('dialog', {
      name: 'Colossus Slayer quick reference',
    })

    expect(sheet).toBeInTheDocument()
    expect(
      within(sheet).getByText(
        'After you hit an enemy that is already wounded, add 1d8 damage.',
      ),
    ).toBeInTheDocument()
    expect(within(sheet).getByText('Timing')).toBeInTheDocument()
    expect(within(sheet).getByText('Once per turn')).toBeInTheDocument()
  })

  it('closes the sheet and returns focus to Colossus Slayer', async () => {
    openCharacterReference()
    fireEvent.click(screen.getByRole('button', { name: /Features, 2 items/ }))

    const colossusRow = screen.getByRole('button', { name: /Colossus Slayer/ })
    fireEvent.click(colossusRow)
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Close Colossus Slayer quick reference',
      }),
    )

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(colossusRow).toHaveFocus()
    })
  })
})
