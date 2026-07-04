import { HomeActions } from './HomeActions';
import { SampleCharacterCard } from './SampleCharacterCard';

export function SignedOutHomeContent({ onExploreMara }: { onExploreMara: () => void }) {
  return (
    <>
      <HomeActions />

      <SampleCharacterCard onExploreMara={onExploreMara} />
    </>
  );
}
