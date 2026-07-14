import type { AccountMode } from '../app/appTypes';
import type { AuthUser } from '../auth/api';
import { AuthForm } from './AuthForm';
import './accounts.css';

interface AccountPanelProps {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  initialMode: AccountMode;
  onAuthenticated: (user: AuthUser) => void;
  onModeChange: (mode: AccountMode) => void;
  onRegistrationSuccess: () => void;
  onSignOut: () => void;
}

export const AccountPanel = ({
  accountsAvailable,
  currentUser,
  initialMode,
  onAuthenticated,
  onModeChange,
  onRegistrationSuccess,
  onSignOut,
}: AccountPanelProps) => {
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
      <AuthForm
        initialMode={initialMode}
        onAuthenticated={onAuthenticated}
        onModeChange={onModeChange}
        onRegistrationSuccess={onRegistrationSuccess}
      />
    </section>
  );
};
