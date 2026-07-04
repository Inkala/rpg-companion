import { HitPointStat, Stat } from '../../characters/CharacterStats';
import { maraLandingPreview } from '../../characters/maraReference';

export function SampleCharacterCard({ onExploreMara }: { onExploreMara: () => void }) {
  return (
    <section className="demo-section" aria-labelledby="sample-character-title">
      <div>
        <p className="eyebrow">Sample character</p>
        <h2 className="section-kicker">Explore a demo</h2>
      </div>

      <section className="sample-card" aria-labelledby="sample-character-title">
        <div className="sample-card__rule" aria-hidden="true" />
        <div className="sample-card__identity">
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

        <button className="button button--secondary" onClick={onExploreMara}>
          Explore Mara
        </button>
      </section>
    </section>
  );
}
