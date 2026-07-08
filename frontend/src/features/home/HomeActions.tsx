import { PlannedActionButton } from './PlannedActionButton';

type HomeActionsProps = {
  onCreateCharacter: () => void;
};

export const HomeActions = ({ onCreateCharacter }: HomeActionsProps) => {
  return (
    <section className="home-actions" aria-labelledby="home-actions-title">
      <header>
        <p className="eyebrow">Start your own</p>
        <h2 id="home-actions-title" className="home-actions__title">
          Choose how Hunin helps next.
        </h2>
        <p className="home-actions__copy">
          Start a character now. Party tools stay visible so the path is
          clear, but they wait for account-backed party work.
        </p>
      </header>

      <div className="main-action-grid">
        <button
          type="button"
          className="button button--primary"
          onClick={onCreateCharacter}
        >
          Create character
        </button>
        <PlannedActionButton label="Create party" />
        <PlannedActionButton label="Join party" />
      </div>
    </section>
  );
};
