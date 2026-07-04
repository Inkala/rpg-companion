import type { AccountMode } from '../app/appTypes';
import type { AuthUser } from '../auth/api';
import { AccountPanel } from '../features/account/AccountPanel';

export function AccountPage({
  accountsAvailable,
  currentUser,
  initialMode,
  onBack,
  onAuthenticated,
  onModeChange,
  onSignOut,
}: {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  initialMode: AccountMode;
  onBack: () => void;
  onAuthenticated: (user: AuthUser) => void;
  onModeChange: (mode: AccountMode) => void;
  onSignOut: () => void;
}) {
  return (
    <main className="app-shell account-page">
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
        onSignOut={onSignOut}
      />
    </main>
  );
}
