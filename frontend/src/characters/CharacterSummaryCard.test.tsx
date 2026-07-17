import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CharacterSummaryCard } from './CharacterSummaryCard';
import type { CharacterSummaryDTO } from './apiTypes';

const character: CharacterSummaryDTO = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Mara Velard',
  className: 'Ranger',
  subclassName: 'Hunter',
  level: 3,
  ancestry: 'Human',
  background: 'Outlander',
  hitPoints: { current: 26, max: 26 },
  armorClass: 14,
  speedFt: 30,
  portraitAssetId: 'mara-vale-portrait',
  portraitAlt: 'Portrait of Mara Velard',
  featuredAbilities: ['Longbow', 'Colossus Slayer'],
  landingConcept:
    'A steady wilderness scout with a clear attack, useful spells, and quick rules reminders.',
  updatedAt: '2026-07-05T10:00:00Z',
};

describe('CharacterSummaryCard', () => {
  it('renders the shared character summary presentation and expands on action', () => {
    const onExpand = vi.fn();

    render(<CharacterSummaryCard character={character} onExpand={onExpand} />);

    const card = screen.getByRole('article', { name: 'Mara Velard' });
    expect(within(card).getByRole('img', { name: 'Portrait of Mara Velard' })).toBeInTheDocument();
    expect(within(card).getByText('Ranger reference')).toBeInTheDocument();
    expect(within(card).getByRole('heading', { name: 'Mara Velard' })).toBeInTheDocument();
    expect(within(card).getByText('Human Ranger - Level 3')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Open Character Reference' })).not.toBeInTheDocument();
    expect(within(card).getByText('26')).toBeInTheDocument();
    expect(within(card).getByText('14')).toBeInTheDocument();
    expect(within(card).getByText('30 ft.')).toBeInTheDocument();
    expect(within(card).getByText('AC').closest('.stat')).toHaveClass('stat--ac');
    expect(within(card).getByText('Longbow')).toBeInTheDocument();
    expect(within(card).getByText('Colossus Slayer')).toBeInTheDocument();
    expect(within(card).getByText(/A steady wilderness scout/)).toBeInTheDocument();

    const expand = within(card).getByRole('button', { name: 'Expand' });
    expand.focus();
    expect(expand).toHaveFocus();
    fireEvent.click(expand);

    expect(onExpand).toHaveBeenCalledOnce();
  });

  it('uses the generic avatar for missing or unknown portraits', () => {
    const missingPortrait = {
      ...character,
      portraitAssetId: null,
      portraitAlt: null,
    };
    const unknownPortrait = {
      ...character,
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Unknown Portrait',
      portraitAssetId: 'unknown-portrait',
      portraitAlt: 'Unknown supplied alt',
    };

    render(
      <>
        <CharacterSummaryCard character={missingPortrait} onExpand={vi.fn()} />
        <CharacterSummaryCard character={unknownPortrait} onExpand={vi.fn()} />
      </>,
    );

    expect(screen.getAllByRole('img', { name: 'Generic character avatar' })).toHaveLength(2);
    expect(screen.queryByRole('img', { name: 'Unknown supplied alt' })).not.toBeInTheDocument();
  });
});
