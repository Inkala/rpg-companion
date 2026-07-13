type HomeActionsProps = {
  onCreateCharacter: () => void;
  onCreateParty: () => void;
  onJoinParty: () => void;
};

export const HomeActions = ({
  onCreateCharacter,
  onCreateParty,
  onJoinParty,
}: HomeActionsProps) => {
  return (
    <section className="home-actions" aria-labelledby="home-actions-title">
      <header>
        <p className="eyebrow">Start your own</p>
        <h2 id="home-actions-title" className="home-actions__title">
          Choose how Hunin helps next.
        </h2>
        <p className="home-actions__copy">
          Start a character, create a Party for your group, or open an invite
          you received.
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
        <button
          type="button"
          className="button button--secondary"
          onClick={onCreateParty}
        >
          Create party
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={onJoinParty}
        >
          Join party
        </button>
      </div>
    </section>
  );
};
