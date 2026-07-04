import { PlannedActionCard } from './PlannedActionCard';
import { partyLoginRequiredMessage } from './HomeActions';
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
          <PlannedActionCard label="Create character" variant="primary" />
        </section>

        <section className="home-panel" aria-labelledby="my-parties-title">
          <div>
            <p className="eyebrow">My parties</p>
            <h2 id="my-parties-title" className="home-panel__title">
              No parties yet
            </h2>
            <p className="home-panel__copy">
              Party tools are planned for a later slice and will require an
              account.
            </p>
          </div>
          <div className="panel-action-row">
            <PlannedActionCard
              label="Create party"
              helper={partyLoginRequiredMessage}
            />
            <PlannedActionCard
              label="Join party"
              helper={partyLoginRequiredMessage}
            />
          </div>
        </section>
      </section>

      <SampleCharacterCard onExploreCharacter={onExploreCharacter} />
    </>
  );
};
