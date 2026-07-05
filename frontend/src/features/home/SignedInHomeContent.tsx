import { PlannedActionButton } from './PlannedActionButton';
import { SampleCharacterCard } from '../../characters/SampleCharacterCard';

export const SignedInHomeContent = (
  { onExploreCharacter }: { onExploreCharacter: () => void; }
) => {
  return (
    <>
      <section className="home-stack" aria-label="Your Hunin home">
        <section className="home-panel" aria-labelledby="my-characters-title">
          <div>
            <p className="eyebrow">My characters</p>
            <h2 id="my-characters-title" className="home-panel__title">
              No saved characters yet
            </h2>
            <p className="home-panel__copy">
              Start with a guided character or fill in your sheet manually.
            </p>
          </div>
          <PlannedActionButton label="Create character" variant="primary" />
        </section>

        <section className="home-panel home-panel--parties" aria-labelledby="my-parties-title">
          <p className="eyebrow home-panel__eyebrow">My parties</p>
          <div className="home-panel__intro">
            <div>
              <h2 id="my-parties-title" className="home-panel__title">
                No parties yet
              </h2>
              <p className="home-panel__copy">
                Party tools are planned for a later slice and will require an
                account.
              </p>
            </div>
            <PlannedActionButton label="Create party" />
            <PlannedActionButton label="Join party" />
          </div>
        </section>
      </section>

      <SampleCharacterCard onExploreCharacter={onExploreCharacter} />
    </>
  );
};
