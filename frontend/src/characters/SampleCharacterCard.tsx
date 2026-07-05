import { HitPointStat, Stat } from './CharacterStats';
import { maraLandingPreview } from './maraReference';
import './characters.css';

interface SampleCharacterCardProps {
  onExploreCharacter: () => void;
}

export const SampleCharacterCard = ({ onExploreCharacter }: SampleCharacterCardProps) => {
  return (
    <section className="demo-section" aria-labelledby="sample-character-title">
      <p className="eyebrow">Sample character</p>

      <section className="sample-card" aria-labelledby="sample-character-title">
        <div className="sample-card__identity">
          <div className="sample-card__summary">
            <img
              className="portrait portrait--landing"
              src={maraLandingPreview.portrait.src}
              alt={maraLandingPreview.portrait.alt}
            />
            <div>
              <p className="eyebrow">Ranger reference</p>
              <h3 id="sample-character-title" className="character-name">
                {maraLandingPreview.name}
              </h3>
              <p className="identity-line">{maraLandingPreview.identity}</p>
            </div>
          </div>
          <button className="button button--primary sample-card__action" onClick={onExploreCharacter}>
            Expand
          </button>
        </div>

        <dl className="landing-stat-strip" aria-label="Mara Velard quick stats">
          <HitPointStat hitPoints={maraLandingPreview.stats.hitPoints} />
          <Stat label="AC" value={maraLandingPreview.stats.armorClass} />
          <Stat label="Speed" value={maraLandingPreview.stats.speed} />
        </dl>

        <div className="badge-row" aria-label="Featured abilities">
          {maraLandingPreview.featuredAbilities.map((ability) => (
            <span className="badge badge--neutral" key={ability}>
              {ability}
            </span>
          ))}
        </div>

        <p className="preview-note">{maraLandingPreview.concept}</p>
      </section>
    </section>
  );
};
