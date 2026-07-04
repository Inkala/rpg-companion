import '../accounts/accounts.css';

export const NotFoundPage = ({ onHome }: { onHome: () => void }) => {
  return (
    <main className="app-shell account-page">
      <header className="reference-nav">
        <button className="back-button" onClick={onHome}>
          Home
        </button>
      </header>
      <section className="account-card account-card--quiet">
        <p className="eyebrow">Not found</p>
        <h1 className="account-title">Page not found</h1>
        <p className="account-card__text">
          This Hunin page does not exist yet.
        </p>
        <button type="button" className="button button--secondary" onClick={onHome}>
          Home
        </button>
      </section>
    </main>
  );
};
