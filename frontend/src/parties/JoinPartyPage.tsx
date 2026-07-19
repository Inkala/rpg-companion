import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CharacterSummaryDTO } from '../characters/apiTypes';
import { PartiesApiError } from './api';
import type {
  JoinPartyRequestDTO,
  JoinPartyByCodeRequestDTO,
  JoinPartyResponseDTO,
  PartyInviteInspectionRequestDTO,
  PartyInviteCodeInspectionRequestDTO,
  PartyInviteInspectionResponseDTO,
} from './apiTypes';
import {
  inviteCredentialsMatch,
  normalizeInviteCode,
  type InviteCredential,
} from './inviteCode';
import './parties.css';

type InspectInvite = (
  input: PartyInviteInspectionRequestDTO,
) => Promise<PartyInviteInspectionResponseDTO>;
type InspectInviteByCode = (
  input: PartyInviteCodeInspectionRequestDTO,
) => Promise<PartyInviteInspectionResponseDTO>;
type LoadCharacters = () => Promise<CharacterSummaryDTO[]>;
type JoinParty = (input: JoinPartyRequestDTO) => Promise<JoinPartyResponseDTO>;
type JoinPartyByCode = (input: JoinPartyByCodeRequestDTO) => Promise<JoinPartyResponseDTO>;

type JoinPartyPageProps = {
  credential?: InviteCredential | null;
  token?: string | null;
  showUnavailable?: boolean;
  isSignedIn: boolean;
  inspectInvite: InspectInvite;
  inspectInviteByCode?: InspectInviteByCode;
  loadCharacters: LoadCharacters;
  joinParty: JoinParty;
  joinPartyByCode?: JoinPartyByCode;
  onSignIn: () => void;
  onCreateAccount?: () => void;
  onSubmitCode?: (code: string) => void;
  onCreateCharacter: () => void;
  onJoined: (partyId: string) => void;
  onCancel: () => void;
  onInviteUnavailable: (credential: InviteCredential) => void;
  onTryAnotherCode?: () => void;
  savedCharacterJoinState?: 'joining' | 'error';
  onRetrySavedCharacterJoin?: () => void;
};

type LoadKey = {
  requestedCredential: InviteCredential | null;
  requestedIsSignedIn: boolean;
  requestedInspector: InspectInvite;
  requestedCodeInspector: InspectInviteByCode | undefined;
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

type InteractionKey = LoadKey & {
  requestedJoiner: JoinParty;
  requestedCodeJoiner: JoinPartyByCode | undefined;
};

type InteractionState = InteractionKey & {
  selectedCharacterId: string | null;
  selectionError: string | null;
  joinError: string | null;
  isJoining: boolean;
};

const characterSelectionErrorId = 'party-character-selection-error';

export const JoinPartyPage = ({
  credential: suppliedCredential,
  token,
  showUnavailable = false,
  isSignedIn,
  inspectInvite,
  inspectInviteByCode,
  loadCharacters,
  joinParty,
  joinPartyByCode,
  onSignIn,
  onCreateAccount,
  onSubmitCode,
  onCreateCharacter,
  onJoined,
  onCancel,
  onInviteUnavailable,
  onTryAnotherCode,
  savedCharacterJoinState,
  onRetrySavedCharacterJoin,
}: JoinPartyPageProps) => {
  const credential = suppliedCredential === undefined
    ? token === null || token === undefined
      ? null
      : { kind: 'token' as const, value: token }
    : suppliedCredential;
  const credentialKind = credential?.kind;
  const credentialValue = credential?.value;
  const [loadAttempt, setLoadAttempt] = useState(0);
  const currentLoadKey: LoadKey = {
    requestedCredential: credential,
    requestedIsSignedIn: isSignedIn,
    requestedInspector: inspectInvite,
    requestedCodeInspector: credential?.kind === 'code' ? inspectInviteByCode : undefined,
    requestedCharacterLoader: loadCharacters,
    requestedAttempt: loadAttempt,
  };
  const currentInteractionKey: InteractionKey = {
    ...currentLoadKey,
    requestedJoiner: joinParty,
    requestedCodeJoiner: credential?.kind === 'code' ? joinPartyByCode : undefined,
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
    const requestCredential: InviteCredential | null =
      credentialKind && credentialValue
        ? { kind: credentialKind, value: credentialValue }
        : null;
    const requestKey: LoadKey = {
      requestedCredential: requestCredential,
      requestedIsSignedIn: isSignedIn,
      requestedInspector: inspectInvite,
      requestedCodeInspector:
        requestCredential?.kind === 'code' ? inspectInviteByCode : undefined,
      requestedCharacterLoader: loadCharacters,
      requestedAttempt: loadAttempt,
    };

    if (savedCharacterJoinState !== undefined) {
      return () => {
        isActive = false;
      };
    }

    if (!isSignedIn || requestCredential === null) {
      setLoadState({ status: 'loading', ...requestKey });
      return () => {
        isActive = false;
      };
    }

    setLoadState({ status: 'loading', ...requestKey });
    Promise.all([
      inspectCredential(requestCredential, inspectInvite, inspectInviteByCode).catch((error) => {
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
            onInviteUnavailable(requestCredential);
            return;
          }

          setLoadState({ status: 'error', ...requestKey });
        }
      });

    return () => {
      isActive = false;
    };
  }, [
    inspectInvite,
    isSignedIn,
    loadAttempt,
    loadCharacters,
    onInviteUnavailable,
    savedCharacterJoinState,
    credentialKind,
    credentialValue,
    inspectInviteByCode,
  ]);

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

    const activeJoinKey = activeJoinKeyRef.current;
    if (activeJoinKey && interactionKeysMatch(activeJoinKey, currentInteractionKey)) {
      return;
    }

    const selectedCharacterId = visibleInteractionState.selectedCharacterId;
    if (selectedCharacterId === null || credential === null) {
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
      const joined = await joinWithCredential(
        credential,
        selectedCharacterId,
        joinParty,
        joinPartyByCode,
      );
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
          onInviteUnavailable(credential);
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
      {credential !== null && !showUnavailable ? (
        <header className="reference-nav">
          <button type="button" className="back-button" onClick={onCancel}>
            Cancel
          </button>
        </header>
      ) : null}

      {credential === null && showUnavailable ? (
        <UnavailableInviteState
          isSignedIn={isSignedIn}
          onTryAnotherCode={onTryAnotherCode}
          onExit={onCancel}
        />
      ) : credential === null ? (
        <InviteCodeEntryState onSubmitCode={onSubmitCode} onCancel={onCancel} />
      ) : !isSignedIn ? (
        <SignedOutJoinState onSignIn={onSignIn} onCreateAccount={onCreateAccount} />
      ) : savedCharacterJoinState !== undefined ? (
        <SavedCharacterJoinState
          status={savedCharacterJoinState}
          onRetry={onRetrySavedCharacterJoin}
        />
      ) : visibleLoadState.status === 'loading' ? (
        <LoadingInviteState />
      ) : visibleLoadState.status === 'unavailable' ? (
        <UnavailableInviteState
          isSignedIn={isSignedIn}
          onTryAnotherCode={onTryAnotherCode}
          onExit={onCancel}
        />
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

const SignedOutJoinState = ({
  onSignIn,
  onCreateAccount,
}: {
  onSignIn: () => void;
  onCreateAccount?: () => void;
}) => (
  <section
    className="account-card party-state-card party-join-state"
    aria-labelledby="signed-out-invite-title"
  >
    <p className="eyebrow">Party invite</p>
    <h1 id="signed-out-invite-title" className="account-title">
      Sign in to use this party invite
    </h1>
    <p>Sign in before Hunin checks this private invitation.</p>
    <div className="party-actions">
      <button type="button" className="button button--primary" onClick={onSignIn}>
        Sign in
      </button>
      {onCreateAccount ? (
        <button type="button" className="button button--secondary" onClick={onCreateAccount}>
          Create account
        </button>
      ) : null}
    </div>
  </section>
);

const InviteCodeEntryState = ({
  onSubmitCode,
  onCancel,
}: {
  onSubmitCode?: (code: string) => void;
  onCancel: () => void;
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, []);

  const submitCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeInviteCode(codeInput);
    if (!normalized.ok) {
      setCodeError(normalized.error);
      inputRef.current?.focus();
      return;
    }

    setCodeInput('');
    setCodeError(null);
    onSubmitCode?.(normalized.value);
  };

  return (
    <section
      className="account-card party-state-card party-join-state"
      aria-labelledby="join-party-code-title"
    >
      <h1 id="join-party-code-title" className="account-title">Join a party</h1>
      <p>Enter the invitation code shared by your GM.</p>
      <form
        className="party-join-form party-invite-code-form"
        onSubmit={submitCode}
        noValidate
      >
        <label
          className="form-field party-form__field party-invite-code-form__field"
          htmlFor="party-invitation-code"
        >
          <span>Invitation code</span>
          <input
            ref={inputRef}
            id="party-invitation-code"
            className="form-input party-form__input party-invite-code__input"
            type="text"
            value={codeInput}
            onChange={(event) => {
              setCodeInput(event.target.value);
              setCodeError(null);
            }}
            autoComplete="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="characters"
            inputMode="text"
            maxLength={24}
            aria-describedby={codeError ? 'party-invite-code-error' : undefined}
            aria-invalid={codeError ? 'true' : undefined}
          />
        </label>
        {codeError ? (
          <p id="party-invite-code-error" className="form-error" role="alert">
            {codeError}
          </p>
        ) : null}
        <div className="party-actions party-invite-code-form__actions">
          <button type="submit" className="button button--primary">Continue</button>
          <button type="button" className="button button--secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
};

const SavedCharacterJoinState = ({
  status,
  onRetry,
}: {
  status: 'joining' | 'error';
  onRetry?: () => void;
}) => (
  <section
    className="account-card party-state-card party-join-state"
    aria-labelledby="saved-character-join-title"
  >
    <p className="eyebrow">Party invite</p>
    <h1 id="saved-character-join-title" className="account-title">
      {status === 'joining' ? 'Joining party' : 'Could not join party'}
    </h1>
    {status === 'joining' ? (
      <p role="status">Joining with your saved character...</p>
    ) : (
      <>
        <p role="alert">Your character is saved. Try joining the party again.</p>
        {onRetry ? (
          <button type="button" className="button button--secondary" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </>
    )}
  </section>
);

const UnavailableInviteState = ({
  isSignedIn,
  onTryAnotherCode,
  onExit,
}: {
  isSignedIn: boolean;
  onTryAnotherCode?: () => void;
  onExit: () => void;
}) => {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      className="account-card party-state-card party-join-state"
      aria-labelledby="unavailable-invite-title"
    >
      <h1
        ref={headingRef}
        id="unavailable-invite-title"
        className="account-title"
        tabIndex={-1}
      >
        Party invite unavailable
      </h1>
      <p role="alert">This party invite is unavailable.</p>
      <div className="party-actions">
        {onTryAnotherCode ? (
          <button type="button" className="button button--primary" onClick={onTryAnotherCode}>
            Try another code
          </button>
        ) : null}
        <button type="button" className="button button--secondary" onClick={onExit}>
          {isSignedIn ? 'Go to My parties' : 'Go home'}
        </button>
      </div>
    </section>
  );
};

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
    inviteCredentialsMatch(left.requestedCredential, right.requestedCredential) &&
    left.requestedIsSignedIn === right.requestedIsSignedIn &&
    left.requestedInspector === right.requestedInspector &&
    left.requestedCodeInspector === right.requestedCodeInspector &&
    left.requestedCharacterLoader === right.requestedCharacterLoader &&
    left.requestedAttempt === right.requestedAttempt
  );
};

const inspectCredential = (
  credential: InviteCredential,
  inspectInvite: InspectInvite,
  inspectInviteByCode: InspectInviteByCode | undefined,
) => {
  if (credential.kind === 'token') {
    return inspectInvite({ token: credential.value });
  }

  if (!inspectInviteByCode) {
    return Promise.reject(new Error('Code inspection is unavailable.'));
  }
  return inspectInviteByCode({ code: credential.value });
};

const joinWithCredential = (
  credential: InviteCredential,
  characterId: string,
  joinParty: JoinParty,
  joinPartyByCode: JoinPartyByCode | undefined,
) => {
  if (credential.kind === 'token') {
    return joinParty({ token: credential.value, characterId });
  }

  if (!joinPartyByCode) {
    return Promise.reject(new Error('Code joining is unavailable.'));
  }
  return joinPartyByCode({ code: credential.value, characterId });
};

const interactionKeysMatch = (left: InteractionKey, right: InteractionKey) => {
  return (
    loadKeysMatch(left, right) &&
    left.requestedJoiner === right.requestedJoiner &&
    left.requestedCodeJoiner === right.requestedCodeJoiner
  );
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
