import { PlannedActionCard } from './PlannedActionCard';

export const partyLoginRequiredMessage =
  'You’ll need an account to create or join a party.';

export function HomeActions() {
  return (
    <section className="home-actions" aria-labelledby="home-actions-title">
      <div>
        <p className="eyebrow">Start your own</p>
        <h2 id="home-actions-title" className="home-actions__title">
          Choose how Hunin helps next.
        </h2>
        <p className="home-actions__copy">
          Start a character now. Party tools stay visible so the path is
          clear, but they wait for account-backed party work.
        </p>
      </div>

      <div className="main-action-grid">
        <PlannedActionCard label="Create character" variant="primary" />
        <PlannedActionCard
          label="Create party"
          helper={partyLoginRequiredMessage}
        />
        <PlannedActionCard
          label="Join party"
          helper={partyLoginRequiredMessage}
        />
      </div>
    </section>
  );
}
