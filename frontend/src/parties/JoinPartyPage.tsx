import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CharacterSummaryDTO } from '../characters/apiTypes';
import { PartiesApiError } from './api';
import type {
  JoinPartyRequestDTO,
  JoinPartyResponseDTO,
  PartyInviteInspectionRequestDTO,
  PartyInviteInspectionResponseDTO,
} from './apiTypes';
import './parties.css';

type InspectInvite = (
  input: PartyInviteInspectionRequestDTO,
) => Promise<PartyInviteInspectionResponseDTO>;
type LoadCharacters = () => Promise<CharacterSummaryDTO[]>;
type JoinParty = (input: JoinPartyRequestDTO) => Promise<JoinPartyResponseDTO>;

type JoinPartyPageProps = {
  token: string | null;
  isSignedIn: boolean;
  inspectInvite: InspectInvite;
  loadCharacters: LoadCharacters;
  joinParty: JoinParty;
  onSignIn: () => void;
  onCreateCharacter: () => void;
  onJoined: (partyId: string) => void;
  onCancel: () => void;
  onInviteUnavailable: (token: string) => void;
};

type LoadKey = {
  requestedToken: string | null;
  requestedIsSignedIn: boolean;
  requestedInspector: InspectInvite;
  requestedCharacterLoader: LoadCharacters;
  requestedAttempt: number;
};

type LoadState = LoadKey & (
  | { status: 'loading' }
  | {
    status: 'loaded';
    inspection: PartyInviteInspectionResponseDTO;
    characters: CharacterSummaryDTO[];
  }
  | { status: 'unavailable' }
  | { status: 'error' }
);

type InteractionKey = LoadKey & { requestedJoiner: JoinParty };

type InteractionState = InteractionKey & {
  selectedCharacterId: string | null;
  selectionError: string | null;
  joinError: string | null;
  isJoining: boolean;
};

const characterSelectionErrorId = 'party-character-selection-error';

export const JoinPartyPage = ({
  token,
  isSignedIn,
  inspectInvite,
  loadCharacters,
  joinParty,
  onSignIn,
  onCreateCharacter,
  onJoined,
  onCancel,
  onInviteUnavailable,
}: JoinPartyPageProps) => {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const currentLoadKey: LoadKey = {
    requestedToken: token,
    requestedIsSignedIn: isSignedIn,
    requestedInspector: inspectInvite,
    requestedCharacterLoader: loadCharacters,
    requestedAttempt: loadAttempt,
  };
  const currentInteractionKey: InteractionKey = {
    ...currentLoadKey,
    requestedJoiner: joinParty,
  };
  const [loadState, setLoadState] = useState<LoadState>({
    status: 'loading',
    ...currentLoadKey,
  });
  const [interactionState, setInteractionState] = useState<InteractionState>({
    ...currentInteractionKey,
    selectedCharacterId: null,
    selectionError: null,
    joinError: null,
    isJoining: false,
  });
  const currentInteractionKeyRef = useRef(currentInteractionKey);
  const activeJoinKeyRef = useRef<InteractionKey | null>(null);
  const isMountedRef = useRef(true);
  const firstCharacterInputRef = useRef<HTMLInputElement | null>(null);
  currentInteractionKeyRef.current = currentInteractionKey;

  const visibleLoadState = loadKeysMatch(loadState, currentLoadKey)
    ? loadState
    : ({ status: 'loading', ...currentLoadKey } as LoadState);
  const visibleInteractionState = interactionKeysMatch(interactionState, currentInteractionKey)
    ? interactionState
    : emptyInteractionState(currentInteractionKey);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const requestKey: LoadKey = {
      requestedToken: token,
      requestedIsSignedIn: isSignedIn,
      requestedInspector: inspectInvite,
      requestedCharacterLoader: loadCharacters,
      requestedAttempt: loadAttempt,
    };

    if (!isSignedIn || token === null) {
      setLoadState({ status: 'loading', ...requestKey });
      return () => {
        isActive = false;
      };
    }

    setLoadState({ status: 'loading', ...requestKey });
    Promise.all([
      inspectInvite({ token }).catch((error) => {
        throw new InviteInspectionFailure(error);
      }),
      loadCharacters(),
    ])
      .then(([inspection, characters]) => {
        if (isActive) {
          setLoadState({
            status: 'loaded',
            inspection,
            characters,
            ...requestKey,
          });
        }
      })
      .catch((error) => {
        if (isActive) {
          if (
            error instanceof InviteInspectionFailure &&
            isUnavailableInviteError(error.cause)
          ) {
            setLoadState({ status: 'unavailable', ...requestKey });
            onInviteUnavailable(token);
            return;
          }

          setLoadState({ status: 'error', ...requestKey });
        }
      });

    return () => {
      isActive = false;
    };
  }, [inspectInvite, isSignedIn, loadAttempt, loadCharacters, onInviteUnavailable, token]);

  const selectCharacter = (characterId: string) => {
    setInteractionState({
      ...currentInteractionKey,
      selectedCharacterId: characterId,
      selectionError: null,
      joinError: null,
      isJoining: false,
    });
  };

  const submitJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      activeJoinKeyRef.current &&
      interactionKeysMatch(activeJoinKeyRef.current, currentInteractionKey)
    ) {
      return;
    }

    const selectedCharacterId = visibleInteractionState.selectedCharacterId;
    if (selectedCharacterId === null || token === null) {
      setInteractionState({
        ...currentInteractionKey,
        selectedCharacterId,
        selectionError: 'Choose a character before joining.',
        joinError: null,
        isJoining: false,
      });
      firstCharacterInputRef.current?.focus();
      return;
    }

    const joinKey = currentInteractionKey;
    activeJoinKeyRef.current = joinKey;
    setInteractionState({
      ...joinKey,
      selectedCharacterId,
      selectionError: null,
      joinError: null,
      isJoining: true,
    });

    try {
      const joined = await joinParty({ token, characterId: selectedCharacterId });
      if (
        isMountedRef.current &&
        interactionKeysMatch(currentInteractionKeyRef.current, joinKey)
      ) {
        onJoined(joined.partyId);
      }
    } catch (error) {
      if (
        isMountedRef.current &&
        interactionKeysMatch(currentInteractionKeyRef.current, joinKey)
      ) {
        if (isUnavailableJoinError(error)) {
          setLoadState({ status: 'unavailable', ...joinKey });
          onInviteUnavailable(token);
          return;
        }

        setInteractionState({
          ...joinKey,
          selectedCharacterId,
          selectionError: null,
          joinError: safeJoinErrorMessage(error),
          isJoining: false,
        });
      }
    } finally {
      if (
        activeJoinKeyRef.current &&
        interactionKeysMatch(activeJoinKeyRef.current, joinKey)
      ) {
        activeJoinKeyRef.current = null;
      }

      if (
        isMountedRef.current &&
        interactionKeysMatch(currentInteractionKeyRef.current, joinKey)
      ) {
        setInteractionState((current) => ({ ...current, isJoining: false }));
      }
    }
  };

  return (
    <main className="app-shell account-page party-page party-join-page">
      <header className="reference-nav">
        <button type="button" className="back-button" onClick={onCancel}>
          Cancel
        </button>
      </header>

      {!isSignedIn ? (
        <SignedOutJoinState onSignIn={onSignIn} />
      ) : token === null ? (
        <UnavailableInviteState />
      ) : visibleLoadState.status === 'loading' ? (
        <LoadingInviteState />
      ) : visibleLoadState.status === 'unavailable' ? (
        <UnavailableInviteState />
      ) : visibleLoadState.status === 'error' ? (
        <InviteLoadError onRetry={() => setLoadAttempt((current) => current + 1)} />
      ) : visibleLoadState.characters.length === 0 ? (
        <NoCharactersState
          partyName={visibleLoadState.inspection.party.name}
          onCreateCharacter={onCreateCharacter}
        />
      ) : (
        <JoinCharacterForm
          partyName={visibleLoadState.inspection.party.name}
          characters={visibleLoadState.characters}
          interaction={visibleInteractionState}
          firstCharacterInputRef={firstCharacterInputRef}
          onSelectCharacter={selectCharacter}
          onSubmit={submitJoin}
        />
      )}
    </main>
  );
};

const SignedOutJoinState = ({ onSignIn }: { onSignIn: () => void }) => (
  <section
    className="account-card party-state-card party-join-state"
    aria-labelledby="signed-out-invite-title"
  >
    <p className="eyebrow">Party invite</p>
    <h1 id="signed-out-invite-title" className="account-title">
      Sign in to use this party invite
    </h1>
    <p>Sign in before Hunin checks this private invitation.</p>
    <button type="button" className="button button--primary" onClick={onSignIn}>
      Sign in
    </button>
  </section>
);

const UnavailableInviteState = () => (
  <section
    className="account-card party-state-card party-join-state"
    aria-labelledby="unavailable-invite-title"
  >
    <h1 id="unavailable-invite-title" className="account-title">Party invite unavailable</h1>
    <p role="alert">This party invite is unavailable.</p>
  </section>
);

const LoadingInviteState = () => (
  <section
    className="account-card party-state-card party-join-state"
    aria-labelledby="loading-invite-title"
  >
    <h1 id="loading-invite-title" className="account-title">Party invite</h1>
    <p role="status">Checking party invite...</p>
  </section>
);

const InviteLoadError = ({ onRetry }: { onRetry: () => void }) => (
  <section
    className="account-card party-state-card party-join-state"
    aria-labelledby="invite-error-title"
  >
    <h1 id="invite-error-title" className="account-title">Could not load party invite</h1>
    <p role="alert">Could not load this party invite. Please try again.</p>
    <button type="button" className="button button--secondary" onClick={onRetry}>Retry</button>
  </section>
);

const NoCharactersState = ({
  partyName,
  onCreateCharacter,
}: {
  partyName: string;
  onCreateCharacter: () => void;
}) => (
  <section
    className="account-card party-state-card party-join-state"
    aria-labelledby="no-characters-title"
  >
    <p className="party-join__party-name">Party: <strong>{partyName}</strong></p>
    <h1 id="no-characters-title" className="account-title">Create or transfer a character first</h1>
    <p>You need one saved character before joining this party.</p>
    <button type="button" className="button button--primary" onClick={onCreateCharacter}>
      Create or transfer character
    </button>
  </section>
);

const JoinCharacterForm = ({
  partyName,
  characters,
  interaction,
  firstCharacterInputRef,
  onSelectCharacter,
  onSubmit,
}: {
  partyName: string;
  characters: CharacterSummaryDTO[];
  interaction: InteractionState;
  firstCharacterInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectCharacter: (characterId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) => (
  <section
    className="account-card party-state-card party-join-card"
    aria-labelledby="join-party-title"
  >
    <p className="eyebrow">Party invite</p>
    <h1 id="join-party-title" className="account-title party-join__title">Join {partyName}</h1>
    <form
      className="party-join-form"
      onSubmit={onSubmit}
      noValidate
      aria-busy={interaction.isJoining}
    >
      <fieldset
        className="party-character-picker"
        aria-invalid={interaction.selectionError ? 'true' : undefined}
        aria-describedby={interaction.selectionError ? characterSelectionErrorId : undefined}
      >
        <legend className="party-character-picker__legend">Choose a character</legend>
        {characters.map((character, index) => (
          <label className="party-character-option" key={character.id}>
            <input
              className="party-character-option__input"
              ref={index === 0 ? firstCharacterInputRef : undefined}
              type="radio"
              name="party-character"
              value={character.id}
              checked={interaction.selectedCharacterId === character.id}
              disabled={interaction.isJoining}
              onChange={() => onSelectCharacter(character.id)}
            />
            <span className="party-character-option__content">
              <strong className="party-character-option__name">{character.name}</strong>
              <span className="party-character-option__meta">
                {characterClassLine(character)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {interaction.selectionError ? (
        <p id={characterSelectionErrorId} className="form-error" role="alert">
          {interaction.selectionError}
        </p>
      ) : null}
      {interaction.joinError ? (
        <p className="form-error" role="alert">{interaction.joinError}</p>
      ) : null}

      <div className="party-actions party-join-form__actions">
        <button type="submit" className="button button--primary" disabled={interaction.isJoining}>
          {interaction.isJoining ? 'Joining party...' : 'Join party'}
        </button>
      </div>
    </form>
  </section>
);

const characterClassLine = (character: CharacterSummaryDTO) => {
  return [character.className, character.subclassName, `Level ${character.level}`]
    .filter(Boolean)
    .join(' - ');
};

const emptyInteractionState = (key: InteractionKey): InteractionState => ({
  ...key,
  selectedCharacterId: null,
  selectionError: null,
  joinError: null,
  isJoining: false,
});

const loadKeysMatch = (left: LoadKey, right: LoadKey) => {
  return (
    left.requestedToken === right.requestedToken &&
    left.requestedIsSignedIn === right.requestedIsSignedIn &&
    left.requestedInspector === right.requestedInspector &&
    left.requestedCharacterLoader === right.requestedCharacterLoader &&
    left.requestedAttempt === right.requestedAttempt
  );
};

const interactionKeysMatch = (left: InteractionKey, right: InteractionKey) => {
  return loadKeysMatch(left, right) && left.requestedJoiner === right.requestedJoiner;
};

const safeJoinErrorMessage = (error: unknown) => {
  if (error instanceof PartiesApiError) {
    switch (error.code) {
      case 'invite_unavailable':
        return 'This party invite is unavailable.';
      case 'already_member':
        return 'You are already a member of this party.';
      case 'character_already_linked':
        return 'This character is already linked to a party. Choose another character.';
      case 'authentication_required':
        return 'Your session has expired. Sign in again.';
      case 'rate_limited':
        return 'Too many join attempts. Please try again later.';
    }
  }

  return 'Could not join the party. Please try again.';
};

const isUnavailableJoinError = (error: unknown) => {
  return error instanceof PartiesApiError && error.code === 'invite_unavailable';
};

class InviteInspectionFailure {
  cause: unknown;

  constructor(cause: unknown) {
    this.cause = cause;
  }
}

const isUnavailableInviteError = (error: unknown) => {
  return (
    error instanceof PartiesApiError &&
    (error.code === 'invite_unavailable' || error.status === 400)
  );
};
