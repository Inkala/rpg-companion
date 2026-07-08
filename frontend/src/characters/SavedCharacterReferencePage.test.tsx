import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCharacterById } from './api';
import { SavedCharacterReferencePage } from './SavedCharacterReferencePage';
import { buildGeneratedFighterCharacterSheet } from '../character-creation/generatedFighterBuilds';

const getCharacterByIdMock = vi.mocked(getCharacterById);

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');

  return {
    ...actual,
    getCharacterById: vi.fn(),
  };
});

describe('SavedCharacterReferencePage', () => {
  beforeEach(() => {
    getCharacterByIdMock.mockReset();
  });

  it('shows sign-in-required state while signed out and does not fetch', () => {
    render(
      <SavedCharacterReferencePage
        characterId="saved-1"
        isSignedIn={false}
        onBack={vi.fn()}
        onSignIn={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Sign in to open this character.' })).toBeInTheDocument();
    expect(getCharacterByIdMock).not.toHaveBeenCalled();
  });

  it('shows loading state while fetching a signed-in character', () => {
    getCharacterByIdMock.mockReturnValue(new Promise(() => {}));

    render(
      <SavedCharacterReferencePage
        characterId="saved-1"
        isSignedIn
        onBack={vi.fn()}
        onSignIn={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Loading character...' })).toBeInTheDocument();
    expect(getCharacterByIdMock).toHaveBeenCalledWith('saved-1');
  });

  it('renders Character Reference for a valid CharacterSheetV1 payload', async () => {
    getCharacterByIdMock.mockResolvedValue(savedCharacterWithPayload(
      buildGeneratedFighterCharacterSheet('strength-melee-fighter', 'Branna Shieldhand'),
    ));

    render(
      <SavedCharacterReferencePage
        characterId="saved-1"
        isSignedIn
        onBack={vi.fn()}
        onSignIn={vi.fn()}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Branna Shieldhand' })).toBeInTheDocument();
    expect(screen.getByText('Human Fighter - Level 1')).toBeInTheDocument();
    expect(screen.getByText('Strength melee Fighter - Soldier')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Actions/ })).toBeInTheDocument();
  });

  it('uses a My characters back label for a valid saved reference', async () => {
    getCharacterByIdMock.mockResolvedValue(savedCharacterWithPayload(
      buildGeneratedFighterCharacterSheet('strength-melee-fighter', 'Branna Shieldhand'),
    ));

    render(
      <SavedCharacterReferencePage
        characterId="saved-1"
        isSignedIn
        onBack={vi.fn()}
        onSignIn={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole('button', { name: 'Back to My characters' }),
    ).toBeInTheDocument();
  });

  it('shows a useful fetch error state', async () => {
    getCharacterByIdMock.mockRejectedValue(new Error('Character not found.'));

    render(
      <SavedCharacterReferencePage
        characterId="missing"
        isSignedIn
        onBack={vi.fn()}
        onSignIn={vi.fn()}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Could not load character' })).toBeInTheDocument();
    expect(screen.getByText('Character not found.')).toBeInTheDocument();
  });

  it('shows unsupported state for invalid referencePayload', async () => {
    getCharacterByIdMock.mockResolvedValue(savedCharacterWithPayload({ schemaVersion: 'Unknown' }));

    render(
      <SavedCharacterReferencePage
        characterId="saved-1"
        isSignedIn
        onBack={vi.fn()}
        onSignIn={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Character Reference is not available yet' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/reference data is missing or uses an unsupported format/)).toBeInTheDocument();
  });
});

const savedCharacterWithPayload = (referencePayload: unknown) => ({
  id: 'saved-1',
  ownerSubjectId: 'owner-1',
  name: 'Branna Shieldhand',
  className: 'Fighter',
  subclassName: null,
  level: 1,
  ancestry: 'Human',
  background: 'Soldier',
  abilityScores: {
    strength: 16,
    dexterity: 11,
    constitution: 15,
    intelligence: 9,
    wisdom: 13,
    charisma: 14,
  },
  hitPoints: {
    current: 12,
    max: 12,
  },
  armorClass: 19,
  speedFt: 30,
  referencePayload,
  createdAt: '2026-07-07T10:00:00Z',
  updatedAt: '2026-07-07T10:00:00Z',
});
