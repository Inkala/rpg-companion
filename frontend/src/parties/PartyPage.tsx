import { useEffect, useState, type ReactNode } from 'react';
import genericAvatar from '../assets/characters/generic-avatar.webp';
import type { PartyDetailDTO, PartyMemberDTO, PartyRoleDTO } from './apiTypes';
import './parties.css';

type PartyPageProps = {
  partyId: string;
  isSignedIn: boolean;
  loadParty: PartyLoader;
  onSignIn: () => void;
  onBack: () => void;
  onOpenCharacter: (characterId: string) => void;
  renderPartyTools?: (party: PartyDetailDTO) => ReactNode;
};

type PartyLoader = (partyId: string) => Promise<PartyDetailDTO>;

type PartyRequestKey = {
  requestedPartyId: string;
  requestedLoader: PartyLoader;
  requestedAttempt: number;
};

type PartyPageState = PartyRequestKey & (
  | { status: 'loading' }
  | { status: 'loaded'; party: PartyDetailDTO }
  | { status: 'error' }
);

export const PartyPage = ({
  partyId,
  isSignedIn,
  loadParty,
  onSignIn,
  onBack,
  onOpenCharacter,
  renderPartyTools,
}: PartyPageProps) => {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [state, setState] = useState<PartyPageState>({
    status: 'loading',
    requestedPartyId: partyId,
    requestedLoader: loadParty,
    requestedAttempt: loadAttempt,
  });
  const currentRequestKey: PartyRequestKey = {
    requestedPartyId: partyId,
    requestedLoader: loadParty,
    requestedAttempt: loadAttempt,
  };
  const stateMatchesCurrentRequest =
    state.requestedPartyId === currentRequestKey.requestedPartyId &&
    state.requestedLoader === currentRequestKey.requestedLoader &&
    state.requestedAttempt === currentRequestKey.requestedAttempt;
  const visibleState: PartyPageState = stateMatchesCurrentRequest
    ? state
    : { status: 'loading', ...currentRequestKey };

  useEffect(() => {
    let isActive = true;
    const requestKey: PartyRequestKey = {
      requestedPartyId: partyId,
      requestedLoader: loadParty,
      requestedAttempt: loadAttempt,
    };

    if (!isSignedIn) {
      setState({ status: 'loading', ...requestKey });
      return () => {
        isActive = false;
      };
    }

    setState({ status: 'loading', ...requestKey });
    loadParty(partyId)
      .then((party) => {
        if (isActive) {
          setState({ status: 'loaded', party, ...requestKey });
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
  }, [isSignedIn, loadAttempt, loadParty, partyId]);

  return (
    <main className="app-shell account-page party-page">
      <header className="reference-nav">
        <button type="button" className="back-button" onClick={onBack}>
          Back
        </button>
      </header>

      {!isSignedIn ? (
        <SignedOutPartyState onSignIn={onSignIn} />
      ) : visibleState.status === 'loading' ? (
        <PartyLoadingState />
      ) : visibleState.status === 'error' ? (
        <PartyErrorState onRetry={() => setLoadAttempt((current) => current + 1)} />
      ) : (
        <LoadedParty
          party={visibleState.party}
          onOpenCharacter={onOpenCharacter}
          renderPartyTools={renderPartyTools}
        />
      )}
    </main>
  );
};

const SignedOutPartyState = ({ onSignIn }: { onSignIn: () => void }) => {
  return (
    <section className="account-card" aria-labelledby="signed-out-party-title">
      <p className="eyebrow">Party</p>
      <h1 id="signed-out-party-title" className="account-title">
        Sign in to view this party
      </h1>
      <p>Party details and rosters are private to party members.</p>
      <button type="button" className="button button--primary" onClick={onSignIn}>
        Sign in
      </button>
    </section>
  );
};

const PartyLoadingState = () => {
  return (
    <section className="account-card" aria-labelledby="loading-party-title">
      <h1 id="loading-party-title" className="account-title">
        Party
      </h1>
      <p role="status">Loading party...</p>
    </section>
  );
};

const PartyErrorState = ({ onRetry }: { onRetry: () => void }) => {
  return (
    <section className="account-card" aria-labelledby="party-error-title">
      <p className="eyebrow">Party</p>
      <h1 id="party-error-title" className="account-title">
        Could not load party
      </h1>
      <p role="alert">Could not load this party. Please try again.</p>
      <button type="button" className="button button--secondary" onClick={onRetry}>
        Retry
      </button>
    </section>
  );
};

const LoadedParty = ({
  party,
  onOpenCharacter,
  renderPartyTools,
}: {
  party: PartyDetailDTO;
  onOpenCharacter: (characterId: string) => void;
  renderPartyTools?: (party: PartyDetailDTO) => ReactNode;
}) => {
  const roleLabel = displayRole(party.role);

  return (
    <section className="party-detail" aria-labelledby="party-title">
      <header className="party-detail__header">
        <p className="eyebrow">Party</p>
        <h1 id="party-title" className="party-detail__title">
          {party.name}
        </h1>
        <p className="party-detail__role">
          <span>Your role:</span> <strong>{roleLabel}</strong>
        </p>
      </header>

      {renderPartyTools?.(party)}

      <section className="party-roster" aria-labelledby="party-roster-title">
        <h2 id="party-roster-title" className="party-roster__title">
          Roster
        </h2>
        <ul className="party-roster__list" aria-label={`${party.name} roster`}>
          {party.members.map((member, index) => (
            <PartyMember
              key={`${member.username}-${index}`}
              member={member}
              currentUserRole={party.role}
              index={index}
              onOpenCharacter={onOpenCharacter}
            />
          ))}
        </ul>
      </section>
    </section>
  );
};

const PartyMember = ({
  member,
  currentUserRole,
  index,
  onOpenCharacter,
}: {
  member: PartyMemberDTO;
  currentUserRole: PartyRoleDTO;
  index: number;
  onOpenCharacter: (characterId: string) => void;
}) => {
  const titleId = `party-member-title-${index}`;
  const character = member.character;
  const canOpenCharacter =
    currentUserRole === 'gm' && member.role === 'player' && character !== null;

  return (
    <li className="party-roster__item">
      <article className="party-member-card" aria-labelledby={titleId}>
        <img
          className="party-member-avatar"
          src={genericAvatar}
          alt=""
          aria-hidden="true"
        />
        <div className="party-member-card__content">
          <h3 id={titleId} className="party-member-card__name">
            {member.username}
          </h3>
          <p className="party-member-card__meta">
            Role: <strong>{displayRole(member.role)}</strong>
          </p>
          {character ? (
            <>
              <p className="party-member-card__character">
                Character: <strong>{character.name}</strong>
              </p>
              {canOpenCharacter ? (
                <button
                  type="button"
                  className="button button--secondary party-member-card__action"
                  aria-label={`Open ${character.name} Character Reference`}
                  onClick={() => onOpenCharacter(character.id)}
                >
                  Open Character Reference
                </button>
              ) : null}
            </>
          ) : (
            <p className="party-member-card__empty">No character linked</p>
          )}
        </div>
      </article>
    </li>
  );
};

const displayRole = (role: PartyRoleDTO) => {
  return role === 'gm' ? 'GM' : 'Player';
};
