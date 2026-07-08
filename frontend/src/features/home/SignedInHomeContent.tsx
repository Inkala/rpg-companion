import { useEffect, useState } from 'react';
import { listCharacterSummaries } from '../../characters/api';
import type { CharacterSummaryDTO } from '../../characters/apiTypes';
import { PlannedActionButton } from './PlannedActionButton';
import { SampleCharacterCard } from '../../characters/SampleCharacterCard';

type CharacterSummaryState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error' }
  | { status: 'loaded'; characters: CharacterSummaryDTO[] };

export const SignedInHomeContent = (
  {
    onCreateCharacter,
    onExploreCharacter,
  }: {
    onCreateCharacter: () => void;
    onExploreCharacter: () => void;
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
        <section className="home-panel" aria-labelledby="my-characters-title">
          <CharacterSummaryContent
            state={characterState}
          />
          <button
            type="button"
            className="button button--primary"
            onClick={onCreateCharacter}
          >
            Create character
          </button>
        </section>

        <section className="home-panel home-panel--parties" aria-labelledby="my-parties-title">
          <p className="eyebrow home-panel__eyebrow">My parties</p>
          <header className="home-panel__intro">
            <div>
              <h2 id="my-parties-title" className="home-panel__title">
                No parties yet
              </h2>
              <p className="home-panel__copy">
                Party tools are planned for a later slice and will require an
                account.
              </p>
            </div>
            <PlannedActionButton label="Create party" />
            <PlannedActionButton label="Join party" />
          </header>
        </section>
      </section>

      <SampleCharacterCard onExploreCharacter={onExploreCharacter} />
    </>
  );
};

const CharacterSummaryContent = ({
  state,
}: {
  state: CharacterSummaryState;
}) => {
  if (state.status === 'loading') {
    return (
      <header>
        <p className="eyebrow">My characters</p>
        <h2 id="my-characters-title" className="home-panel__title">
          Loading your characters...
        </h2>
      </header>
    );
  }

  if (state.status === 'error') {
    return (
      <header>
        <p className="eyebrow">My characters</p>
        <h2 id="my-characters-title" className="home-panel__title">
          Couldn’t load characters
        </h2>
        <p className="home-panel__copy">
          Try refreshing the page. Mara is still available below.
        </p>
      </header>
    );
  }

  if (state.status === 'loaded') {
    return (
      <section className="character-summary-list" aria-labelledby="my-characters-title">
        <header>
          <p className="eyebrow">My characters</p>
          <h2 id="my-characters-title" className="home-panel__title">
            Saved characters
          </h2>
        </header>
        {state.characters.map((character) => (
          <CharacterSummaryCard
            character={character}
            key={character.id}
          />
        ))}
      </section>
    );
  }

  return (
    <header>
      <p className="eyebrow">My characters</p>
      <h2 id="my-characters-title" className="home-panel__title">
        No saved characters yet
      </h2>
      <p className="home-panel__copy">
        Start with a guided character or fill in your sheet manually.
      </p>
    </header>
  );
};

const CharacterSummaryCard = ({
  character,
}: {
  character: CharacterSummaryDTO;
}) => {
  const classLine = [
    character.className,
    character.subclassName,
    `Level ${character.level}`,
  ].filter(Boolean).join(' - ');

  return (
    <article className="character-summary-card" aria-labelledby={`character-${character.id}`}>
      <header>
        <h2 id={`character-${character.id}`} className="character-summary-card__title">
          {character.name}
        </h2>
        <p className="character-summary-card__meta">{classLine}</p>
        <p className="character-summary-card__meta">
          {character.ancestry} - {character.background}
        </p>
        <button
          type="button"
          className="character-summary-card__open"
          onClick={() => openSavedCharacter(character.id)}
        >
          Open Character Reference
        </button>
      </header>
      <dl className="character-summary-stats" aria-label={`${character.name} summary stats`}>
        <div>
          <dt>HP</dt>
          <dd>{character.hitPoints.current}/{character.hitPoints.max}</dd>
        </div>
        <div>
          <dt>AC</dt>
          <dd>{character.armorClass}</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>{character.speedFt} ft.</dd>
        </div>
      </dl>
    </article>
  );
};

const openSavedCharacter = (characterId: string) => {
  window.history.pushState(null, '', `/characters/${characterId}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
