import { SignedInHomeContent } from '../features/home/SignedInHomeContent';
import { HomeActions } from '../features/home/HomeActions';
import { SampleCharacterCard } from '../characters/SampleCharacterCard';
import type { PartySummaryDTO } from '../parties/apiTypes';
import '../features/home/home.css';

interface HomePageProps {
  loadParties: () => Promise<PartySummaryDTO[]>;
  onCreateCharacter: () => void;
  onCreateParty: () => void;
  onExploreCharacter: () => void;
  onJoinParty: () => void;
  onOpenParty: (partyId: string) => void;
  onSignIn: () => void;
  isSignedIn?: boolean;
}

export const HomePage = ({
  loadParties,
  onCreateCharacter,
  onCreateParty,
  onExploreCharacter,
  onJoinParty,
  onOpenParty,
  onSignIn,
  isSignedIn = false,
}: HomePageProps) => {
  return (
    <main className="app-shell home-page">
      <p className="home-support">
        Create, bring in, and understand characters while keeping your parties together.
      </p>

      <div className="landing-page">
        {isSignedIn ? (
          <SignedInHomeContent
            loadParties={loadParties}
            onCreateCharacter={onCreateCharacter}
            onCreateParty={onCreateParty}
            onExploreCharacter={onExploreCharacter}
            onJoinParty={onJoinParty}
            onOpenParty={onOpenParty}
            onSignIn={onSignIn}
          />
        ) : (
          <>
            <SampleCharacterCard onExploreCharacter={onExploreCharacter} />
            <HomeActions
              onCreateCharacter={onCreateCharacter}
              onCreateParty={onCreateParty}
              onJoinParty={onJoinParty}
            />
          </>
        )}
      </div>
    </main>
  );
};
