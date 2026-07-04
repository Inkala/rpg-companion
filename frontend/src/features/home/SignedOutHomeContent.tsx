import { HomeActions } from './HomeActions';
import { SampleCharacterCard } from '../../characters/SampleCharacterCard';

export const SignedOutHomeContent = (
  { onExploreCharacter }: { onExploreCharacter: () => void; }
) => {
  return (
    <>
      <HomeActions />

      <SampleCharacterCard onExploreCharacter={onExploreCharacter} />
    </>
  );
};
