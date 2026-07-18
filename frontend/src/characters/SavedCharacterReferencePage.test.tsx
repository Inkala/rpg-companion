import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { getCharacterById, levelUpCharacter } from './api';
import { SavedCharacterReferencePage } from './SavedCharacterReferencePage';
import { buildGeneratedFighterCharacterSheet } from '../character-creation/generatedFighterBuilds';

const getCharacterByIdMock = vi.mocked(getCharacterById);
const levelUpCharacterMock = vi.mocked(levelUpCharacter);
const toastSuccessMock = vi.mocked(toast.success);

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');

  return {
    ...actual,
    getCharacterById: vi.fn(),
    levelUpCharacter: vi.fn(),
  };
});

describe('SavedCharacterReferencePage', () => {
  beforeEach(() => {
    getCharacterByIdMock.mockReset();
    levelUpCharacterMock.mockReset();
    toastSuccessMock.mockReset();
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
    expect(screen.getByRole('button', { name: 'Level up' })).toBeInTheDocument();
  });

  it('opens a keyboard-complete one-level flow and restores focus when cancelled', async () => {
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

    const trigger = await screen.findByRole('button', { name: 'Level up' });
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Level up Branna Shieldhand' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Review earlier choices' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('does not offer Level up for a level 5 or multiclass character', async () => {
    const levelFive = buildGeneratedFighterCharacterSheet('strength-melee-fighter', 'Branna Shieldhand');
    levelFive.identity.classes[0].level = 5;
    getCharacterByIdMock.mockResolvedValueOnce(savedCharacterWithPayload(levelFive, 5));

    const { unmount } = render(
      <SavedCharacterReferencePage
        characterId="saved-1"
        isSignedIn
        onBack={vi.fn()}
        onSignIn={vi.fn()}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Branna Shieldhand' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Level up' })).not.toBeInTheDocument();
    unmount();

    const multiclass = buildGeneratedFighterCharacterSheet('strength-melee-fighter', 'Branna Shieldhand');
    multiclass.identity.classes.push({ name: 'Wizard', level: 1 });
    getCharacterByIdMock.mockResolvedValueOnce(savedCharacterWithPayload(multiclass));
    render(
      <SavedCharacterReferencePage
        characterId="saved-1"
        isSignedIn
        onBack={vi.fn()}
        onSignIn={vi.fn()}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Branna Shieldhand' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Level up' })).not.toBeInTheDocument();
  });

  it('submits decisions once, shows the exact success message, and renders the updated reference', async () => {
    const initialSheet = buildGeneratedFighterCharacterSheet('strength-melee-fighter', 'Branna Shieldhand');
    const updatedSheet = structuredClone(initialSheet);
    updatedSheet.identity.classes[0].level = 2;
    updatedSheet.summary.displayLine = 'Human Fighter - Level 2';
    const initial = savedCharacterWithPayload(initialSheet);
    const updated = {
      ...savedCharacterWithPayload(updatedSheet, 2),
      updatedAt: '2026-07-18T11:00:00Z',
    };
    getCharacterByIdMock.mockResolvedValue(initial);
    levelUpCharacterMock.mockResolvedValue(updated);

    render(
      <SavedCharacterReferencePage
        characterId="saved-1"
        isSignedIn
        onBack={vi.fn()}
        onSignIn={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Level up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByLabelText(/I reviewed the values that will be retained/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm level up' }));

    expect(await screen.findByText('Human Fighter - Level 2')).toBeInTheDocument();
    expect(toastSuccessMock).toHaveBeenCalledWith('Character leveled up.');
    expect(levelUpCharacterMock).toHaveBeenCalledTimes(1);
    const [, request] = levelUpCharacterMock.mock.calls[0];
    expect(request).toEqual(expect.objectContaining({
      expectedUpdatedAt: initial.updatedAt,
      prerequisiteChoices: [],
    }));
    expect(request).not.toHaveProperty('referencePayload');
    expect(request).not.toHaveProperty('className');
    expect(request).not.toHaveProperty('fromLevel');
    expect(request).not.toHaveProperty('toLevel');
  });

  it('renders the generic avatar for a saved generated character without a portrait', async () => {
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
      await screen.findByRole('img', { name: 'Generic character avatar' }),
    ).toBeInTheDocument();
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

  it('does not render malformed user-controlled nested content', async () => {
    const maliciousContent = 'malformed-content-must-not-render';
    const payload = structuredClone(
      buildGeneratedFighterCharacterSheet('strength-melee-fighter', 'Branna Shieldhand'),
    );
    payload.actions[0] = {
      ...payload.actions[0],
      summary: maliciousContent,
      section: 'invalid',
    } as unknown as typeof payload.actions[number];
    getCharacterByIdMock.mockResolvedValue(savedCharacterWithPayload(payload));

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
    expect(screen.queryByText(maliciousContent)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Branna Shieldhand' })).not.toBeInTheDocument();
  });
});

const savedCharacterWithPayload = (referencePayload: unknown, level = 1) => ({
  id: 'saved-1',
  ownerSubjectId: 'owner-1',
  name: 'Branna Shieldhand',
  className: 'Fighter',
  subclassName: null,
  level,
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
