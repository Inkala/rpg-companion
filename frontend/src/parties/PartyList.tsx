import { useEffect, useId, useState, type MouseEvent } from 'react';
import type { PartySummaryDTO } from './apiTypes';
import './parties.css';

type PartyListProps = {
  isSignedIn: boolean;
  loadParties: () => Promise<PartySummaryDTO[]>;
  onSignIn: () => void;
  onCreateParty: () => void;
  onJoinParty: () => void;
  getPartyHref: (partyId: string) => string;
  onOpenParty: (partyId: string) => void;
};

type PartyListState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'loaded'; parties: PartySummaryDTO[] }
  | { status: 'error' };

export const PartyList = ({
  isSignedIn,
  loadParties,
  onSignIn,
  onCreateParty,
  onJoinParty,
  getPartyHref,
  onOpenParty,
}: PartyListProps) => {
  const [state, setState] = useState<PartyListState>({ status: 'loading' });
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;

    if (!isSignedIn) {
      return () => {
        isActive = false;
      };
    }

    setState({ status: 'loading' });
    loadParties()
      .then((parties) => {
        if (!isActive) {
          return;
        }

        setState(
          parties.length === 0
            ? { status: 'empty' }
            : { status: 'loaded', parties },
        );
      })
      .catch(() => {
        if (isActive) {
          setState({ status: 'error' });
        }
      });

    return () => {
      isActive = false;
    };
  }, [isSignedIn, loadAttempt, loadParties]);

  return (
    <section className="party-list" aria-label="My parties">
      {isSignedIn && state.status === 'empty' ? (
        <EmptyPartyList onCreateParty={onCreateParty} onJoinParty={onJoinParty} />
      ) : (
        <>
          <h2 className="eyebrow">My parties</h2>

          {!isSignedIn ? (
            <SignedOutPartyList onSignIn={onSignIn} />
          ) : state.status === 'loading' ? (
            <p className="party-list__status" role="status">Loading your parties...</p>
          ) : state.status === 'error' ? (
            <PartyListError onRetry={() => setLoadAttempt((current) => current + 1)} />
          ) : state.status === 'loaded' ? (
            <LoadedPartyList
              parties={state.parties}
              getPartyHref={getPartyHref}
              onOpenParty={onOpenParty}
            />
          ) : null}
        </>
      )}
    </section>
  );
};

const SignedOutPartyList = ({ onSignIn }: { onSignIn: () => void }) => {
  return (
    <section className="party-list__state" aria-labelledby="signed-out-parties-title">
      <h3 id="signed-out-parties-title">Sign in to see your parties</h3>
      <p>Party membership is private to your Hunin account.</p>
      <button type="button" className="button button--primary" onClick={onSignIn}>
        Sign in
      </button>
    </section>
  );
};

const EmptyPartyList = ({
  onCreateParty,
  onJoinParty,
}: {
  onCreateParty: () => void;
  onJoinParty: () => void;
}) => {
  return (
    <header className="party-list__empty">
      <div className="party-list__empty-copy">
        <h2 className="eyebrow">My parties</h2>
        <h3>There are no quests in sight</h3>
        <p>Create or join an adventure to satisfy your thirst for aventura.</p>
      </div>
      <div className="party-actions">
        <button type="button" className="button button--primary" onClick={onCreateParty}>
          Create
        </button>
        <button type="button" className="button button--secondary" onClick={onJoinParty}>
          Join
        </button>
      </div>
    </header>
  );
};

const PartyListError = ({ onRetry }: { onRetry: () => void }) => {
  return (
    <section className="party-list__state" aria-labelledby="party-list-error-title">
      <h3 id="party-list-error-title">Could not load parties</h3>
      <p role="alert">Could not load your parties. Please try again.</p>
      <button type="button" className="button button--secondary" onClick={onRetry}>
        Retry
      </button>
    </section>
  );
};

const LoadedPartyList = ({
  parties,
  getPartyHref,
  onOpenParty,
}: {
  parties: PartySummaryDTO[];
  getPartyHref: (partyId: string) => string;
  onOpenParty: (partyId: string) => void;
}) => {
  return (
    <ul className="party-list__items" aria-label="Your parties">
      {parties.map((party) => (
        <li className="party-list__item" key={party.id}>
          <PartyListCard
            party={party}
            href={getPartyHref(party.id)}
            onOpenParty={onOpenParty}
          />
        </li>
      ))}
    </ul>
  );
};

const PartyListCard = ({
  party,
  href,
  onOpenParty,
}: {
  party: PartySummaryDTO;
  href: string;
  onOpenParty: (partyId: string) => void;
}) => {
  const titleId = useId();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) {
      return;
    }

    event.preventDefault();
    onOpenParty(party.id);
  };

  return (
    <a
      className="party-list-card"
      href={href}
      aria-labelledby={titleId}
      onClick={handleClick}
    >
      <h3 id={titleId} className="party-list-card__title">
        {party.name}
      </h3>
      <p className="party-list-card__gm">
        <strong>GM:</strong> {party.gm.username}
      </p>
      <h4 className="party-list-card__linked-title">MEMBERS</h4>
      {party.linkedCharacters.length === 0 ? (
        <p className="party-list-card__empty">No members yet.</p>
      ) : (
        <ul className="party-list-card__characters">
          {party.linkedCharacters.map((linkedCharacter) => (
            <li
              className="party-list-card__character"
              key={`${linkedCharacter.characterName}:${linkedCharacter.username}`}
            >
              <strong>{linkedCharacter.characterName}:</strong>{' '}
              <span>{linkedCharacter.username}</span>
            </li>
          ))}
        </ul>
      )}
    </a>
  );
};
