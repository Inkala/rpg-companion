import { useEffect, useState } from 'react';
import { listCharacterSummaries } from '../../characters/api';
import type { CharacterSummaryDTO } from '../../characters/apiTypes';
import { CharacterSummaryCard } from '../../characters/CharacterSummaryCard';
import { SampleCharacterCard } from '../../characters/SampleCharacterCard';
import { PartyList } from '../../parties/PartyList';
import type { PartySummaryDTO } from '../../parties/apiTypes';

type CharacterSummaryState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error' }
  | { status: 'loaded'; characters: CharacterSummaryDTO[] };

export const SignedInHomeContent = (
  {
    onCreateCharacter,
    loadParties,
    onCreateParty,
    onExploreCharacter,
    getPartyHref,
    onJoinParty,
    onOpenParty,
    onSignIn,
  }: {
    onCreateCharacter: () => void;
    loadParties: () => Promise<PartySummaryDTO[]>;
    onCreateParty: () => void;
    onExploreCharacter: () => void;
    getPartyHref: (partyId: string) => string;
    onJoinParty: () => void;
    onOpenParty: (partyId: string) => void;
    onSignIn: () => void;
  },
) => {
  const [characterState, setCharacterState] = useState<CharacterSummaryState>({ status: 'loading' });

  useEffect(() => {
    let isActive = true;

    setCharacterState({ status: 'loading' });
    listCharacterSummaries()
      .then((characters) => {
        if (!isActive) {
          return;
        }

        setCharacterState(
          characters.length > 0 ? { status: 'loaded', characters } : { status: 'empty' },
        );
      })
      .catch(() => {
        if (isActive) {
          setCharacterState({ status: 'error' });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <>
      <section className="home-stack" aria-label="Your Hunin home">
        <section
          className="home-panel home-panel--characters home-panel--muted"
          aria-label="My characters"
        >
          <header className="home-panel__header-row">
            <CharacterSummaryHeading state={characterState} />
            <button
              type="button"
              className="button button--primary"
              onClick={onCreateCharacter}
            >
              Create character
            </button>
          </header>
          <CharacterSummaryContent
            state={characterState}
          />
        </section>

        <section className="home-panel home-panel--parties home-panel--muted">
          <PartyList
            isSignedIn
            loadParties={loadParties}
            onCreateParty={onCreateParty}
            getPartyHref={getPartyHref}
            onJoinParty={onJoinParty}
            onOpenParty={onOpenParty}
            onSignIn={onSignIn}
          />
        </section>
      </section>

      <SampleCharacterCard onExploreCharacter={onExploreCharacter} />
    </>
  );
};

const CharacterSummaryHeading = ({
  state,
}: {
  state: CharacterSummaryState;
}) => {
  if (state.status === 'loading') {
    return (
      <div>
        <p className="eyebrow">My characters</p>
        <h2 id="my-characters-title" className="home-panel__title">
          Loading your characters...
        </h2>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div>
        <p className="eyebrow">My characters</p>
        <h2 id="my-characters-title" className="home-panel__title">
          Couldn’t load characters
        </h2>
        <p className="home-panel__copy">
          Try refreshing the page. Mara is still available below.
        </p>
      </div>
    );
  }

  if (state.status === 'loaded') {
    return (
      <div>
        <p className="eyebrow">My characters</p>
        <h2 id="my-characters-title" className="home-panel__title">
          Saved characters
        </h2>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow">My characters</p>
      <h2 id="my-characters-title" className="home-panel__title">
        No saved characters yet
      </h2>
      <p className="home-panel__copy">
        Start with a guided character or fill in your sheet manually.
      </p>
    </div>
  );
};

const CharacterSummaryContent = ({
  state,
}: {
  state: CharacterSummaryState;
}) => {
  if (state.status !== 'loaded') {
    return null;
  }

  return (
    <ul className="character-summary-list" aria-label="Your saved characters">
      {state.characters.map((character) => (
        <li key={character.id}>
          <CharacterSummaryCard
            character={character}
            onExpand={() => openSavedCharacter(character.id)}
          />
        </li>
      ))}
    </ul>
  );
};

const openSavedCharacter = (characterId: string) => {
  window.history.pushState(null, '', `/characters/${characterId}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
