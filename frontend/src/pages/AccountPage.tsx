import type { AccountMode } from '../app/appTypes';
import type { AuthUser } from '../auth/api';
import { AccountPanel } from '../accounts/AccountPanel';

interface AccountPageProps {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  initialMode: AccountMode;
  onBack: () => void;
  onAuthenticated: (user: AuthUser) => void;
  onModeChange: (mode: AccountMode) => void;
  onRegistrationSuccess: () => void;
  onAuthenticationFailure?: () => boolean;
  onSignOut: () => void;
}

export const AccountPage = ({
  accountsAvailable,
  currentUser,
  initialMode,
  onBack,
  onAuthenticated,
  onModeChange,
  onRegistrationSuccess,
  onAuthenticationFailure,
  onSignOut,
}: AccountPageProps) => {
  return (
    <main className="app-shell account-page account-page--auth">
      <header className="reference-nav">
        <button className="back-button" onClick={onBack}>
          Back
        </button>
      </header>

      <AccountPanel
        accountsAvailable={accountsAvailable}
        currentUser={currentUser}
        initialMode={initialMode}
        onAuthenticated={onAuthenticated}
        onModeChange={onModeChange}
        onRegistrationSuccess={onRegistrationSuccess}
        onAuthenticationFailure={onAuthenticationFailure}
        onSignOut={onSignOut}
      />
    </main>
  );
};
