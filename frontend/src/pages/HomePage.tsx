import type { AccountMode } from '../app/appTypes';
import type { AuthUser } from '../auth/api';
import { HomeHeader } from '../features/home/HomeHeader';
import { PlannedActionDescription } from '../features/home/PlannedActionCard';
import { SignedInHomeContent } from '../features/home/SignedInHomeContent';
import { SignedOutHomeContent } from '../features/home/SignedOutHomeContent';
import '../features/home/home.css';

interface HomePageProps {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  isSessionLoading: boolean;
  sessionError: string | null;
  onExploreCharacter: () => void;
  onOpenAccount: (mode: AccountMode) => void;
  onSignOut: () => void;
}

export const HomePage = ({
  accountsAvailable,
  currentUser,
  isSessionLoading,
  sessionError,
  onExploreCharacter,
  onOpenAccount,
  onSignOut,
}: HomePageProps) => {
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
        <SignedInHomeContent onExploreCharacter={onExploreCharacter} />
      ) : (
        <SignedOutHomeContent onExploreCharacter={onExploreCharacter} />
      )}
    </main>
  );
};
