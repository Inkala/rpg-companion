import type { AccountMode } from '../app/appTypes';
import type { AuthUser } from '../auth/api';
import { HomeHeader } from '../features/home/HomeHeader';
import { PlannedActionDescription } from '../features/home/PlannedActionCard';
import { SignedInHomeContent } from '../features/home/SignedInHomeContent';
import { SignedOutHomeContent } from '../features/home/SignedOutHomeContent';

export function HomePage({
  accountsAvailable,
  currentUser,
  isSessionLoading,
  sessionError,
  onExploreMara,
  onOpenAccount,
  onSignOut,
}: {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  isSessionLoading: boolean;
  sessionError: string | null;
  onExploreMara: () => void;
  onOpenAccount: (mode: AccountMode) => void;
  onSignOut: () => void;
}) {
  return (
    <main className="app-shell landing-page">
      <PlannedActionDescription />

      <HomeHeader
        accountsAvailable={accountsAvailable}
        currentUser={currentUser}
        isSessionLoading={isSessionLoading}
        sessionError={sessionError}
        onOpenAccount={onOpenAccount}
        onSignOut={onSignOut}
      />

      {currentUser ? (
        <SignedInHomeContent onExploreMara={onExploreMara} />
      ) : (
        <SignedOutHomeContent onExploreMara={onExploreMara} />
      )}
    </main>
  );
}
