import { useEffect, useState, type ReactNode } from 'react';
import type { CharacterDTO } from '../characters/apiTypes';
import { CharacterReference } from '../characters/CharacterReference';
import { characterSheetToReference } from '../characters/characterSheetToReference';
import { isCharacterSheetV1 } from '../characters/characterSheetValidation';
import './parties.css';

type LoadPartyCharacter = (
  partyId: string,
  characterId: string,
) => Promise<CharacterDTO>;

type PartyCharacterReferencePageProps = {
  partyId: string;
  characterId: string;
  isSignedIn: boolean;
  loadPartyCharacter: LoadPartyCharacter;
  onBack: () => void;
  onSignIn: () => void;
};

type CharacterRequestKey = {
  requestedPartyId: string;
  requestedCharacterId: string;
  requestedIsSignedIn: boolean;
  requestedLoader: LoadPartyCharacter;
  requestedAttempt: number;
};

type CharacterState = CharacterRequestKey & (
  | { status: 'loading' }
  | { status: 'loaded'; character: CharacterDTO }
  | { status: 'error' }
);

export const PartyCharacterReferencePage = ({
  partyId,
  characterId,
  isSignedIn,
  loadPartyCharacter,
  onBack,
  onSignIn,
}: PartyCharacterReferencePageProps) => {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const currentRequestKey: CharacterRequestKey = {
    requestedPartyId: partyId,
    requestedCharacterId: characterId,
    requestedIsSignedIn: isSignedIn,
    requestedLoader: loadPartyCharacter,
    requestedAttempt: loadAttempt,
  };
  const [state, setState] = useState<CharacterState>({
    status: 'loading',
    ...currentRequestKey,
  });
  const visibleState = characterRequestKeysMatch(state, currentRequestKey)
    ? state
    : ({ status: 'loading', ...currentRequestKey } as CharacterState);

  useEffect(() => {
    let isActive = true;
    const requestKey: CharacterRequestKey = {
      requestedPartyId: partyId,
      requestedCharacterId: characterId,
      requestedIsSignedIn: isSignedIn,
      requestedLoader: loadPartyCharacter,
      requestedAttempt: loadAttempt,
    };

    if (!isSignedIn) {
      setState({ status: 'loading', ...requestKey });
      return () => {
        isActive = false;
      };
    }

    setState({ status: 'loading', ...requestKey });
    loadPartyCharacter(partyId, characterId)
      .then((character) => {
        if (isActive) {
          setState({ status: 'loaded', character, ...requestKey });
        }
      })
      .catch(() => {
        if (isActive) {
          setState({ status: 'error', ...requestKey });
        }
      });

    return () => {
      isActive = false;
    };
  }, [characterId, isSignedIn, loadAttempt, loadPartyCharacter, partyId]);

  if (!isSignedIn) {
    return (
      <PartyCharacterStateLayout
        title="Sign in to view this character"
        onBack={onBack}
      >
        <p>Party characters are private to party members with permission.</p>
        <button type="button" className="button button--primary" onClick={onSignIn}>
          Sign in
        </button>
      </PartyCharacterStateLayout>
    );
  }

  if (visibleState.status === 'loading') {
    return (
      <PartyCharacterStateLayout title="Character Reference" onBack={onBack}>
        <p role="status">Loading character...</p>
      </PartyCharacterStateLayout>
    );
  }

  if (visibleState.status === 'error') {
    return (
      <PartyCharacterStateLayout title="Could not load character" onBack={onBack}>
        <p role="alert">Could not load this character. Please try again.</p>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => setLoadAttempt((current) => current + 1)}
        >
          Retry
        </button>
      </PartyCharacterStateLayout>
    );
  }

  if (!isCharacterSheetV1(visibleState.character.referencePayload)) {
    return (
      <PartyCharacterStateLayout title="Character Reference unavailable" onBack={onBack}>
        <p>This character does not have supported reference data.</p>
      </PartyCharacterStateLayout>
    );
  }

  return (
    <CharacterReference
      character={characterSheetToReference(visibleState.character.referencePayload)}
      onBack={onBack}
      backLabel="Back to party"
    />
  );
};

const PartyCharacterStateLayout = ({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) => (
  <main className="app-shell account-page party-page party-character-state-page">
    <header className="reference-nav">
      <button
        type="button"
        className="back-button"
        aria-label="Back to party"
        onClick={onBack}
      >
        Back
      </button>
    </header>
    <section
      className="account-card party-state-card party-character-state"
      aria-labelledby="party-character-state-title"
    >
      <p className="eyebrow">Character Reference</p>
      <h1
        id="party-character-state-title"
        className="account-title party-character-state__title"
      >
        {title}
      </h1>
      {children}
    </section>
  </main>
);

const characterRequestKeysMatch = (
  left: CharacterRequestKey,
  right: CharacterRequestKey,
) => {
  return (
    left.requestedPartyId === right.requestedPartyId &&
    left.requestedCharacterId === right.requestedCharacterId &&
    left.requestedIsSignedIn === right.requestedIsSignedIn &&
    left.requestedLoader === right.requestedLoader &&
    left.requestedAttempt === right.requestedAttempt
  );
};
