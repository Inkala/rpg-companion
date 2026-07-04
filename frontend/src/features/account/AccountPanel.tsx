import type { AccountMode } from '../../app/appTypes';
import type { AuthUser } from '../../auth/api';
import { AuthForm } from './AuthForm';

export function AccountPanel({
  accountsAvailable,
  currentUser,
  initialMode,
  onAuthenticated,
  onSignOut,
}: {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  initialMode: AccountMode;
  onAuthenticated: (user: AuthUser) => void;
  onSignOut: () => void;
}) {
  if (!accountsAvailable) {
    return (
      <section className="account-card account-card--quiet">
        <p className="eyebrow">Accounts</p>
        <h1 className="account-title">Coming soon</h1>
        <p className="account-card__text">
          Registration and sign-in need the Hunin backend. The public demo keeps Mara available
          without an account.
        </p>
      </section>
    );
  }

  if (currentUser) {
    return (
      <section className="account-card">
        <p className="eyebrow">Signed in</p>
        <h1 className="account-title">{currentUser.username}</h1>
        <p className="account-card__text">{currentUser.username}</p>
        <button type="button" className="button button--secondary" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    );
  }

  return (
    <section className="account-card" aria-labelledby="account-title">
      <AuthForm initialMode={initialMode} onAuthenticated={onAuthenticated} />
    </section>
  );
}
