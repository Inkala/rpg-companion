import type { AccountMode } from '../app/appTypes';
import type { AuthUser } from '../auth/api';
import { HomeHeader } from '../features/home/HomeHeader';
import { PlannedActionDescription } from '../features/home/PlannedActionButton';
import { SignedInHomeContent } from '../features/home/SignedInHomeContent';
import { HomeActions } from '../features/home/HomeActions';
import { SampleCharacterCard } from '../characters/SampleCharacterCard';
import '../features/home/home.css';

interface HomePageProps {
  accountsAvailable: boolean;
  currentUser: AuthUser | null;
  isSessionLoading: boolean;
  sessionError: string | null;
  onExploreCharacter: () => void;
  onHome: () => void;
  onOpenAccount: (mode: AccountMode) => void;
  onSignOut: () => void;
}

export const HomePage = ({
  accountsAvailable,
  currentUser,
  isSessionLoading,
  sessionError,
  onExploreCharacter,
  onHome,
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
        onHome={onHome}
        onOpenAccount={onOpenAccount}
        onSignOut={onSignOut}
      />

      {currentUser ? (
        <SignedInHomeContent onExploreCharacter={onExploreCharacter} />
      ) : (
        <>
          <SampleCharacterCard onExploreCharacter={onExploreCharacter} />
          <HomeActions />
        </>
      )}
    </main>
  );
};
