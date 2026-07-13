import { useEffect, useState } from 'react';
import type { PartySummaryDTO } from './apiTypes';
import './parties.css';

type PartyListProps = {
  isSignedIn: boolean;
  loadParties: () => Promise<PartySummaryDTO[]>;
  onSignIn: () => void;
  onCreateParty: () => void;
  onJoinParty: () => void;
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
    <section className="party-list" aria-labelledby="my-parties-title">
      <p className="eyebrow">Parties</p>
      <h2 id="my-parties-title" className="party-list__title">My parties</h2>

      {!isSignedIn ? (
        <SignedOutPartyList onSignIn={onSignIn} />
      ) : state.status === 'loading' ? (
        <p className="party-list__status" role="status">Loading your parties...</p>
      ) : state.status === 'empty' ? (
        <EmptyPartyList onCreateParty={onCreateParty} onJoinParty={onJoinParty} />
      ) : state.status === 'error' ? (
        <PartyListError onRetry={() => setLoadAttempt((current) => current + 1)} />
      ) : (
        <LoadedPartyList parties={state.parties} onOpenParty={onOpenParty} />
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
    <section className="party-list__state" aria-labelledby="empty-parties-title">
      <h3 id="empty-parties-title">No parties yet</h3>
      <p role="status">You have not joined a party yet.</p>
      <div className="party-actions">
        <button type="button" className="button button--primary" onClick={onCreateParty}>
          Create party
        </button>
        <button type="button" className="button button--secondary" onClick={onJoinParty}>
          Join party
        </button>
      </div>
    </section>
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
  onOpenParty,
}: {
  parties: PartySummaryDTO[];
  onOpenParty: (partyId: string) => void;
}) => {
  return (
    <ul className="party-list__items" aria-label="Your parties">
      {parties.map((party, index) => {
        const titleId = `party-list-title-${index}`;
        const roleLabel = party.role === 'gm' ? 'GM' : 'Player';

        return (
          <li className="party-list__item" key={party.id}>
            <article className="party-list-card" aria-labelledby={titleId}>
              <h3 id={titleId} className="party-list-card__title">{party.name}</h3>
              <p className="party-list-card__role">
                Role: <strong>{roleLabel}</strong>
              </p>
              <button
                type="button"
                className="button button--secondary party-list-card__action"
                onClick={() => onOpenParty(party.id)}
                aria-label={`Open ${party.name}`}
              >
                Open party
              </button>
            </article>
          </li>
        );
      })}
    </ul>
  );
};
