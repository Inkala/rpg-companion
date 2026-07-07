import { PlannedActionDescription } from '../features/home/PlannedActionButton';
import { SignedInHomeContent } from '../features/home/SignedInHomeContent';
import { HomeActions } from '../features/home/HomeActions';
import { SampleCharacterCard } from '../characters/SampleCharacterCard';
import '../features/home/home.css';

interface HomePageProps {
  onCreateCharacter: () => void;
  onExploreCharacter: () => void;
  isSignedIn?: boolean;
}

export const HomePage = ({
  onCreateCharacter,
  onExploreCharacter,
  isSignedIn = false,
}: HomePageProps) => {
  return (
    <main className="app-shell landing-page">
      <PlannedActionDescription />

      {isSignedIn ? (
        <SignedInHomeContent
          onCreateCharacter={onCreateCharacter}
          onExploreCharacter={onExploreCharacter}
        />
      ) : (
        <>
          <SampleCharacterCard onExploreCharacter={onExploreCharacter} />
          <HomeActions onCreateCharacter={onCreateCharacter} />
        </>
      )}
    </main>
  );
};
