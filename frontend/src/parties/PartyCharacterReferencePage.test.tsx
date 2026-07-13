import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { buildGeneratedFighterCharacterSheet } from '../character-creation/generatedFighterBuilds';
import type { CharacterDTO } from '../characters/apiTypes';
import { PartyCharacterReferencePage } from './PartyCharacterReferencePage';

const brannaCharacter = partyCharacterWithPayload(
  'character-1',
  buildGeneratedFighterCharacterSheet('strength-melee-fighter', 'Branna Shieldhand'),
);

const dainCharacter = partyCharacterWithPayload(
  'character-2',
  buildGeneratedFighterCharacterSheet('dexterity-archer-fighter', 'Dain Swiftbow'),
);

describe('PartyCharacterReferencePage', () => {
  it('shows a signed-out state without loading and keeps sign-in and back actions', () => {
    const loadPartyCharacter = vi.fn();
    const onSignIn = vi.fn();
    const onBack = vi.fn();

    renderPage({ isSignedIn: false, loadPartyCharacter, onSignIn, onBack });

    expect(screen.getByRole('heading', { name: 'Sign in to view this character' })).toBeInTheDocument();
    expect(loadPartyCharacter).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to party' }));
    expect(onSignIn).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('provides scoped shell hooks for private Character Reference states', () => {
    const pendingLoad = deferred<CharacterDTO>();
    const { container } = renderPage({
      loadPartyCharacter: vi.fn().mockReturnValue(pendingLoad.promise),
    });

    expect(container.querySelector('main')).toHaveClass(
      'party-page',
      'party-character-state-page',
    );
    expect(screen.getByRole('heading', { name: 'Character Reference' })).toHaveClass(
      'party-character-state__title',
    );
    expect(screen.getByRole('status').closest('section')).toHaveClass(
      'party-state-card',
      'party-character-state',
    );
  });

  it('loads with both identifiers and shows an accessible loading state', () => {
    const pendingLoad = deferred<CharacterDTO>();
    const loadPartyCharacter = vi.fn().mockReturnValue(pendingLoad.promise);

    renderPage({
      partyId: 'party-requested',
      characterId: 'character-requested',
      loadPartyCharacter,
    });

    expect(screen.getByRole('status')).toHaveTextContent('Loading character...');
    expect(loadPartyCharacter).toHaveBeenCalledWith('party-requested', 'character-requested');
  });

  it('shows a safe generic error and retries without backend prose', async () => {
    const loadPartyCharacter = vi
      .fn()
      .mockRejectedValueOnce(new Error('sensitive backend authorization detail'))
      .mockResolvedValueOnce(brannaCharacter);

    renderPage({ loadPartyCharacter });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load this character. Please try again.');
    expect(alert).not.toHaveTextContent('sensitive backend authorization detail');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByRole('status')).toHaveTextContent('Loading character...');
    expect(await screen.findByRole('heading', { name: 'Branna Shieldhand' })).toBeInTheDocument();
    expect(loadPartyCharacter).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['missing', undefined],
    ['malformed', { schemaVersion: 'CharacterSheetV1' }],
    ['unsupported', { schemaVersion: 'Unknown' }],
  ])('fails closed for a %s reference payload', async (_, referencePayload) => {
    renderPage({
      loadPartyCharacter: vi.fn().mockResolvedValue(
        partyCharacterWithPayload('character-1', referencePayload),
      ),
    });

    expect(
      await screen.findByRole('heading', { name: 'Character Reference unavailable' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Branna Shieldhand' })).not.toBeInTheDocument();
  });

  it('maps a valid CharacterSheetV1 payload into the existing read-only Character Reference', async () => {
    const onBack = vi.fn();
    renderPage({ loadPartyCharacter: vi.fn().mockResolvedValue(brannaCharacter), onBack });

    expect(await screen.findByRole('heading', { name: 'Branna Shieldhand' })).toBeInTheDocument();
    expect(screen.getByText('Human Fighter - Level 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Actions/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to party' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it.each(['partyId', 'characterId', 'loader'] as const)(
    'immediately hides stale private character data when %s changes',
    async (changedProperty) => {
      const pendingReplacement = deferred<CharacterDTO>();
      const initialLoader = vi.fn((partyId: string, characterId: string) => {
        return partyId === 'party-1' && characterId === 'character-1'
          ? Promise.resolve(brannaCharacter)
          : pendingReplacement.promise;
      });
      const replacementLoader = vi.fn().mockReturnValue(pendingReplacement.promise);
      const props = defaultProps({ loadPartyCharacter: initialLoader });
      const committedViews: string[] = [];

      const CommitObserver = ({
        partyId,
        characterId,
        loader,
      }: {
        partyId: string;
        characterId: string;
        loader: Parameters<typeof PartyCharacterReferencePage>[0]['loadPartyCharacter'];
      }) => {
        useLayoutEffect(() => {
          committedViews.push(document.body.textContent ?? '');
        }, [partyId, characterId, loader]);

        return (
          <PartyCharacterReferencePage
            {...props}
            partyId={partyId}
            characterId={characterId}
            loadPartyCharacter={loader}
          />
        );
      };

      const { rerender } = render(
        <CommitObserver
          partyId="party-1"
          characterId="character-1"
          loader={initialLoader}
        />,
      );
      expect(await screen.findByRole('heading', { name: 'Branna Shieldhand' })).toBeInTheDocument();

      rerender(
        <CommitObserver
          partyId={changedProperty === 'partyId' ? 'party-2' : 'party-1'}
          characterId={changedProperty === 'characterId' ? 'character-2' : 'character-1'}
          loader={changedProperty === 'loader' ? replacementLoader : initialLoader}
        />,
      );

      const changedCommit = committedViews.at(-1) ?? '';
      expect(changedCommit).toContain('Loading character...');
      expect(changedCommit).not.toContain('Branna Shieldhand');
      expect(screen.getByRole('status')).toHaveTextContent('Loading character...');
    },
  );

  it.each(['partyId', 'characterId', 'loader'] as const)(
    'ignores a late result after %s changes',
    async (changedProperty) => {
      const oldLoad = deferred<CharacterDTO>();
      const oldLoader = vi.fn().mockReturnValue(oldLoad.promise);
      const replacementLoader = vi.fn().mockResolvedValue(dainCharacter);
      const props = defaultProps({ loadPartyCharacter: oldLoader });
      const { rerender } = render(<PartyCharacterReferencePage {...props} />);

      rerender(
        <PartyCharacterReferencePage
          {...props}
          partyId={changedProperty === 'partyId' ? 'party-2' : 'party-1'}
          characterId={changedProperty === 'characterId' ? 'character-2' : 'character-1'}
          loadPartyCharacter={changedProperty === 'loader' ? replacementLoader : vi.fn().mockResolvedValue(dainCharacter)}
        />,
      );
      expect(await screen.findByRole('heading', { name: 'Dain Swiftbow' })).toBeInTheDocument();

      oldLoad.resolve(brannaCharacter);
      await waitFor(() => {
        expect(screen.queryByText('Branna Shieldhand')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Dain Swiftbow' })).toBeInTheDocument();
      });
    },
  );

  it('ignores a late result after signing out', async () => {
    const pendingLoad = deferred<CharacterDTO>();
    const props = defaultProps({ loadPartyCharacter: vi.fn().mockReturnValue(pendingLoad.promise) });
    const { rerender } = render(<PartyCharacterReferencePage {...props} />);

    rerender(<PartyCharacterReferencePage {...props} isSignedIn={false} />);
    pendingLoad.resolve(brannaCharacter);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in to view this character' })).toBeInTheDocument();
      expect(screen.queryByText('Branna Shieldhand')).not.toBeInTheDocument();
    });
  });

  it('ignores a late result after unmounting', async () => {
    const pendingLoad = deferred<CharacterDTO>();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderPage({
      loadPartyCharacter: vi.fn().mockReturnValue(pendingLoad.promise),
    });

    unmount();
    pendingLoad.resolve(brannaCharacter);

    await waitFor(() => {
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
    consoleErrorSpy.mockRestore();
  });
});

const renderPage = (
  overrides: Partial<Parameters<typeof PartyCharacterReferencePage>[0]> = {},
) => {
  return render(<PartyCharacterReferencePage {...defaultProps(overrides)} />);
};

const defaultProps = (
  overrides: Partial<Parameters<typeof PartyCharacterReferencePage>[0]> = {},
): Parameters<typeof PartyCharacterReferencePage>[0] => ({
  partyId: 'party-1',
  characterId: 'character-1',
  isSignedIn: true,
  loadPartyCharacter: vi.fn().mockResolvedValue(brannaCharacter),
  onBack: vi.fn(),
  onSignIn: vi.fn(),
  ...overrides,
});

function partyCharacterWithPayload(
  id: string,
  referencePayload: unknown,
): CharacterDTO {
  return {
    id,
    ownerSubjectId: 'owner-1',
    name: 'Party character',
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
    hitPoints: { current: 12, max: 12 },
    armorClass: 19,
    speedFt: 30,
    referencePayload,
    createdAt: '2026-07-12T10:00:00Z',
    updatedAt: '2026-07-12T10:00:00Z',
  };
}

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};
